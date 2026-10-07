import { createHash } from "node:crypto";
import path from "node:path";
import {
  log,
  objectHashesAt,
  readBlobs,
  repoRootFor,
  type GitCommit,
} from "@saflib/git";
import {
  stageInstallManifests,
  stripDevDependencies,
  stripPackageJsonForInstall,
} from "./docker.ts";
import type { BuildInputs } from "./inputs.ts";
import type { Lockfile } from "./lockfile.ts";

/**
 * Historical estimate of how often each build's inputs change — i.e. how
 * often an input-hash-tagged image would actually need rebuilding.
 *
 * Approximations (this is a measurement, not the real hash):
 * - Uses *today's* input paths and workspace sets for every historical
 *   commit (dependency sets that changed over time aren't reconstructed).
 * - Generated inputs are re-derived from committed sources: the staged
 *   install manifests by running {@link stageInstallManifests} on each
 *   commit's root `package.json` + `package-lock.json` (exactly as
 *   `saf-docker generate` stages them), and the generated `Dockerfile` by its
 *   `Dockerfile.template`.
 * - Upstream builds contribute their paths and staged manifests.
 */
export interface SkipRateOptions {
  contextDir: string;
  /** Number of consecutive commit pairs to compare. */
  commits: number;
  /** Ref to walk back from (first-parent). */
  rev?: string;
  /** Every workspace in the monorepo: context-relative dir → package name. */
  workspaces: ReadonlyMap<string, string>;
  /** Whether the context is saflib itself (affects root manifest staging). */
  isSaflibRoot: boolean;
}

export interface BuildSkipRate {
  ref: string;
  /** Commits (out of `compared`) where any input changed. */
  rebuilds: number;
  /** Of `rebuilds`, how many changed *only* in the staged install manifests. */
  lockfileOnlyRebuilds: number;
  /**
   * Rebuilds had staging not been pruned per image (the whole lockfile and
   * root manifest staged for every image), for comparison.
   */
  rebuildsWithoutPruning: number;
  /** Rebuilds from source changes alone (no lockfile churn at all). */
  sourceOnlyRebuilds: number;
  /** Generated inputs that had no committed source to stand in for them. */
  unapproximated: string[];
}

export interface SkipRateReport {
  rev: string;
  /** Number of commit-to-parent comparisons. */
  compared: number;
  newest?: GitCommit;
  oldest?: GitCommit;
  builds: BuildSkipRate[];
  /** Comparisons where at least one build would rebuild. */
  commitsWithAnyRebuild: number;
  /**
   * Commits whose submodule pointer named a commit missing from the local
   * submodule clone; their nested paths read as changed.
   */
  unknownSubmoduleCommits: string[];
}

/** One staged install (an image's `.saf-docker/stage/<image>/`). */
interface Stage {
  image: string;
  workspaceDirs: string[];
}

interface HistoricalInputs {
  paths: Set<string>;
  stages: Stage[];
  unapproximated: Set<string>;
}

const sha = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function historicalInputs(
  result: BuildInputs,
  byRef: Map<string, BuildInputs>,
  options: SkipRateOptions,
): HistoricalInputs {
  const out: HistoricalInputs = {
    paths: new Set(),
    stages: [],
    unapproximated: new Set(),
  };
  const dockerfileKey = path
    .relative(options.contextDir, result.build.dockerfilePath)
    .split(path.sep)
    .join("/");
  const workspaceDirs: string[] = [];
  let staged = false;
  for (const input of result.inputs) {
    if (input.kind === "git") {
      out.paths.add(input.key);
      if (options.workspaces.has(input.key)) workspaceDirs.push(input.key);
    } else if (input.kind === "file") {
      if (input.key.startsWith(".saf-docker/stage/")) {
        staged = true;
      } else if (input.key === dockerfileKey) {
        out.paths.add(`${dockerfileKey}.template`);
      } else {
        out.unapproximated.add(input.key);
      }
    } else if (input.kind === "upstream") {
      const upstream = byRef.get(input.key);
      if (!upstream) continue;
      const nested = historicalInputs(upstream, byRef, options);
      nested.paths.forEach((p) => out.paths.add(p));
      out.stages.push(...nested.stages);
      nested.unapproximated.forEach((p) => out.unapproximated.add(p));
    }
  }
  if (staged) out.stages.push({ image: result.build.image, workspaceDirs });
  return out;
}

/**
 * Resolves context-relative paths to object hashes at a commit of the
 * context's repo, following submodule gitlinks for paths in nested repos.
 */
class HistoricalResolver {
  private readonly located = new Map<
    string,
    { repoRoot: string; gitlinkPath: string; repoRelative: string }
  >();

  private readonly contextDir: string;
  private readonly contextRepo: string;
  readonly unknownCommits = new Set<string>();

  constructor(contextDir: string, contextRepo: string) {
    this.contextDir = contextDir;
    this.contextRepo = contextRepo;
  }

  private locate(contextRelative: string) {
    const abs = path.join(this.contextDir, contextRelative);
    const { result: repoRoot, error } = repoRootFor(abs);
    if (error) throw error;
    const toPosix = (p: string) => p.split(path.sep).join("/");
    return {
      repoRoot,
      repoRelative: toPosix(path.relative(repoRoot, abs)),
      gitlinkPath: toPosix(path.relative(this.contextRepo, repoRoot)),
    };
  }

  hashesAt(commit: string, paths: string[]): Map<string, string | null> {
    const direct: string[] = [];
    const directKeys: string[] = [];
    const nestedGroups = new Map<
      string,
      { contextPaths: string[]; repoRoot: string; repoRelative: string[] }
    >();

    for (const p of paths) {
      let loc = this.located.get(p);
      if (!loc) {
        loc = this.locate(p);
        this.located.set(p, loc);
      }
      if (loc.gitlinkPath === "") {
        direct.push(loc.repoRelative);
        directKeys.push(p);
      } else {
        const group = nestedGroups.get(loc.gitlinkPath) ?? {
          contextPaths: [],
          repoRoot: loc.repoRoot,
          repoRelative: [],
        };
        group.contextPaths.push(p);
        group.repoRelative.push(loc.repoRelative);
        nestedGroups.set(loc.gitlinkPath, group);
      }
    }

    const out = new Map<string, string | null>();
    const lookups = [...direct, ...nestedGroups.keys()];
    const { result, error } = objectHashesAt(this.contextRepo, commit, lookups);
    if (error) throw error;
    directKeys.forEach((key, i) => out.set(key, result.get(direct[i]) ?? null));

    for (const [gitlinkPath, group] of nestedGroups) {
      const gitlink = result.get(gitlinkPath);
      const nested = gitlink
        ? objectHashesAt(group.repoRoot, gitlink, group.repoRelative)
        : undefined;
      if (gitlink && !nested?.result) {
        this.unknownCommits.add(`${gitlinkPath}@${gitlink}`);
      }
      group.contextPaths.forEach((key, i) => {
        // An unknown submodule commit (not fetched) reads as "changed".
        const hash = nested?.result?.get(group.repoRelative[i]);
        out.set(key, hash === undefined ? `unknown:${gitlink}` : hash);
      });
    }
    return out;
  }
}

interface RootManifests {
  /** Distinguishes commits whose root manifests are byte-identical. */
  key: string;
  packageJson?: Record<string, unknown>;
  lockfile?: Lockfile;
}

/** The root `package.json` + `package-lock.json` at each commit. */
function rootManifestHistory(
  repoRoot: string,
  contextRelative: string,
  commits: GitCommit[],
): RootManifests[] {
  const prefix = contextRelative.split(path.sep).join("/");
  const pjPath = path.posix.join(prefix, "package.json");
  const lockPath = path.posix.join(prefix, "package-lock.json");
  const blobPairs = commits.map((c) => {
    const { result, error } = objectHashesAt(repoRoot, c.hash, [
      pjPath,
      lockPath,
    ]);
    if (error) throw error;
    return [result.get(pjPath) ?? null, result.get(lockPath) ?? null] as const;
  });
  const { result: blobs, error } = readBlobs(
    repoRoot,
    blobPairs.flatMap((pair) => pair.filter((h): h is string => h !== null)),
  );
  if (error) throw error;
  const parsed = new Map<string, RootManifests>();
  return blobPairs.map(([pjHash, lockHash]) => {
    const key = `${pjHash}:${lockHash}`;
    let manifests = parsed.get(key);
    if (!manifests) {
      const pj = pjHash ? blobs.get(pjHash) : undefined;
      const lock = lockHash ? blobs.get(lockHash) : undefined;
      manifests =
        pj && lock
          ? { key, packageJson: JSON.parse(pj), lockfile: JSON.parse(lock) }
          : { key };
      parsed.set(key, manifests);
    }
    return manifests;
  });
}

/** Hash of the unpruned staging (pre-pruning behavior), for comparison. */
function unprunedStageHash(manifests: RootManifests): string {
  if (!manifests.packageJson || !manifests.lockfile) return manifests.key;
  const packages = Object.fromEntries(
    Object.entries(manifests.lockfile.packages ?? {}).map(([key, entry]) => {
      const { devDependencies: _devDependencies, ...rest } = entry;
      return [key, rest];
    }),
  );
  return sha([
    stripDevDependencies(stripPackageJsonForInstall(manifests.packageJson)),
    packages,
  ]);
}

export function measureSkipRate(
  results: BuildInputs[],
  allResults: BuildInputs[],
  options: SkipRateOptions,
): SkipRateReport {
  const { contextDir } = options;
  const rev = options.rev ?? "HEAD";
  const { result: contextRepo, error: repoError } = repoRootFor(contextDir);
  if (repoError) throw repoError;
  const { result: commits, error: logError } = log(contextRepo, {
    ref: rev,
    limit: options.commits + 1,
  });
  if (logError) throw logError;

  const byRef = new Map(allResults.map((r) => [r.build.ref, r]));
  const perBuild = results.map((r) => ({
    ref: r.build.ref,
    ...historicalInputs(r, byRef, options),
  }));
  const allPaths = Array.from(
    new Set(perBuild.flatMap((b) => [...b.paths])),
  ).sort();

  const resolver = new HistoricalResolver(contextDir, contextRepo);
  // Oldest first.
  const ordered = commits.slice().reverse();
  const snapshots = ordered.map((c) => resolver.hashesAt(c.hash, allPaths));
  const roots = rootManifestHistory(
    contextRepo,
    path.relative(contextRepo, contextDir),
    ordered,
  );
  const unpruned = roots.map(unprunedStageHash);

  const allWorkspaceNames = new Set(options.workspaces.values());
  const stageHashes = new Map<string, string>();
  const stageHash = (manifests: RootManifests, stage: Stage): string => {
    if (!manifests.packageJson || !manifests.lockfile) return manifests.key;
    const cacheKey = `${manifests.key}\t${stage.image}`;
    let hash = stageHashes.get(cacheKey);
    if (!hash) {
      hash = sha(
        stageInstallManifests(manifests.packageJson, manifests.lockfile, {
          imageName: stage.image,
          workspaceDirs: stage.workspaceDirs,
          imageWorkspaceNames: new Set(
            stage.workspaceDirs.map((dir) => options.workspaces.get(dir)!),
          ),
          allWorkspaceNames,
          isSaflibRoot: options.isSaflibRoot,
        }),
      );
      stageHashes.set(cacheKey, hash);
    }
    return hash;
  };

  const builds: BuildSkipRate[] = perBuild.map((b) => ({
    ref: b.ref,
    rebuilds: 0,
    lockfileOnlyRebuilds: 0,
    rebuildsWithoutPruning: 0,
    sourceOnlyRebuilds: 0,
    unapproximated: Array.from(b.unapproximated).sort(),
  }));
  let commitsWithAnyRebuild = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const next = snapshots[i];
    const unprunedChanged = unpruned[i] !== unpruned[i - 1];
    let any = false;
    perBuild.forEach((b, j) => {
      const sourceChanged = [...b.paths].some(
        (p) => prev.get(p) !== next.get(p),
      );
      const stageChanged = b.stages.some(
        (stage) =>
          stageHash(roots[i], stage) !== stageHash(roots[i - 1], stage),
      );
      if (sourceChanged) builds[j].sourceOnlyRebuilds++;
      if (sourceChanged || (b.stages.length > 0 && unprunedChanged)) {
        builds[j].rebuildsWithoutPruning++;
      }
      if (sourceChanged || stageChanged) {
        builds[j].rebuilds++;
        any = true;
        if (!sourceChanged) builds[j].lockfileOnlyRebuilds++;
      }
    });
    if (any) commitsWithAnyRebuild++;
  }

  return {
    rev,
    compared: Math.max(snapshots.length - 1, 0),
    newest: commits[0],
    oldest: commits[commits.length - 1],
    builds,
    commitsWithAnyRebuild,
    unknownSubmoduleCommits: Array.from(resolver.unknownCommits),
  };
}
