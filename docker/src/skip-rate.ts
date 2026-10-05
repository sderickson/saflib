import path from "node:path";
import { createHash } from "node:crypto";
import {
  log,
  objectHashesAt,
  readBlobs,
  repoRootFor,
  type GitCommit,
} from "@saflib/git";
import { stripDevDependencies, stripPackageJsonForInstall } from "./docker.ts";
import type { BuildInputs } from "./inputs.ts";

/**
 * Historical estimate of how often each build's inputs change — i.e. how
 * often an input-hash-tagged image would actually need rebuilding.
 *
 * Approximations (this is a go/no-go measurement, not the real hash):
 * - Uses *today's* input paths for every historical commit (dependency sets
 *   that changed over time aren't reconstructed).
 * - Generated inputs are re-derived from committed sources: the staged
 *   install manifests from the root `package.json` + `package-lock.json` at
 *   each commit (stripped the way staging strips them), and the generated
 *   `Dockerfile` by its `Dockerfile.template`.
 * - Upstream builds contribute their (approximated) paths.
 */
export interface SkipRateOptions {
  contextDir: string;
  /** Number of consecutive commit pairs to compare. */
  commits: number;
  /** Ref to walk back from (first-parent). */
  rev?: string;
}

export interface BuildSkipRate {
  ref: string;
  /** Commits (out of `compared`) where any input changed. */
  rebuilds: number;
  /** Of `rebuilds`, how many changed *only* in the staged install manifests. */
  lockfileOnlyRebuilds: number;
  /**
   * Rebuilds if the staged lockfile also dropped dev-only (`"dev": true`)
   * entries — a lower bound on what pruning would save is
   * `rebuilds - rebuildsWithDevPrunedLock`.
   */
  rebuildsWithDevPrunedLock: number;
  /**
   * Rebuilds if each image's staged lockfile were pruned to the production
   * dependency closure of its own workspace packages.
   */
  rebuildsWithClosureLock: number;
  /** Rebuilds from source changes alone (perfect lockfile pruning bound). */
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

interface HistoricalPaths {
  paths: Set<string>;
  /** Context-relative package dirs whose dependency closure the image installs. */
  workspaces: Set<string>;
  /** Whether the build stages install manifests (non-bun builds). */
  usesLock: boolean;
  unapproximated: Set<string>;
}

interface LockVariants {
  staged: string;
  devPruned: string;
  /** Staged root manifest + lock entries, for per-image closure hashing. */
  root?: unknown;
  packages?: LockEntries;
  closures?: Map<string, string>;
}

/** Hash of the staged root manifest plus `workspaces`' lock closure. */
function closureHash(variants: LockVariants, workspaces: Set<string>): string {
  if (!variants.packages) return variants.staged;
  variants.closures ??= new Map();
  const cacheKey = [...workspaces].sort().join("\n");
  let hash = variants.closures.get(cacheKey);
  if (!hash) {
    const packages = variants.packages;
    hash = sha([
      variants.root,
      lockClosure(packages, workspaces).map((key) => [key, packages[key]]),
    ]);
    variants.closures.set(cacheKey, hash);
  }
  return hash;
}

const sha = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

/**
 * Hashes of the staged install manifests as `saf-docker generate` derives
 * them (dep-relevant root `package.json` fields, lockfile without
 * `devDependencies` keys), plus a variant with dev-only entries dropped.
 */
type LockEntries = Record<string, Record<string, unknown>>;

/**
 * Lock entries reachable from `workspaces` through production dependencies
 * (`dependencies`, `optionalDependencies`, `peerDependencies`), resolved the
 * way node does: nearest `node_modules/<name>` walking up from the dependent,
 * following workspace links.
 */
export function lockClosure(
  packages: LockEntries,
  workspaces: Iterable<string>,
): string[] {
  const seen = new Set<string>();
  const queue = [...workspaces].filter((w) => packages[w]);
  const resolve = (from: string, name: string): string | undefined => {
    let base = from;
    while (true) {
      const candidate =
        base === "" ? `node_modules/${name}` : `${base}/node_modules/${name}`;
      if (packages[candidate]) return candidate;
      if (base === "") return undefined;
      const nm = base.lastIndexOf("/node_modules/");
      base = nm === -1 ? "" : base.slice(0, nm);
    }
  };
  while (queue.length > 0) {
    const key = queue.pop()!;
    if (seen.has(key)) continue;
    seen.add(key);
    const entry = packages[key];
    if (entry.link && typeof entry.resolved === "string") {
      queue.push(entry.resolved);
      continue;
    }
    for (const field of [
      "dependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      for (const name of Object.keys(
        (entry[field] as Record<string, string>) ?? {},
      )) {
        const dep = resolve(key, name);
        if (dep) queue.push(dep);
      }
    }
  }
  return [...seen].sort();
}

export function lockVariants(
  packageJson: string,
  packageLock: string,
): LockVariants {
  const root = stripDevDependencies(
    stripPackageJsonForInstall(
      JSON.parse(packageJson) as Record<string, unknown>,
    ),
  );
  const lock = JSON.parse(packageLock) as {
    packages?: Record<string, Record<string, unknown>>;
  };
  const packages = lock.packages ?? {};
  const staged: Record<string, unknown> = {};
  const devPruned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(packages)) {
    const { devDependencies: _dev, ...rest } = entry;
    staged[key] = rest;
    if (!entry.dev) devPruned[key] = rest;
  }
  return {
    staged: sha([root, staged]),
    devPruned: sha([root, devPruned]),
    root,
    packages: staged as LockEntries,
  };
}

function historicalPaths(
  result: BuildInputs,
  byRef: Map<string, BuildInputs>,
  contextDir: string,
): HistoricalPaths {
  const out: HistoricalPaths = {
    paths: new Set(),
    workspaces: new Set(),
    usesLock: false,
    unapproximated: new Set(),
  };
  const dockerfileKey = path
    .relative(contextDir, result.build.dockerfilePath)
    .split(path.sep)
    .join("/");
  for (const input of result.inputs) {
    if (input.kind === "git") {
      out.paths.add(input.key);
      out.workspaces.add(input.key);
    } else if (input.kind === "file") {
      if (input.key.startsWith(".saf-docker/stage/")) {
        out.usesLock = true;
      } else if (input.key === dockerfileKey) {
        out.paths.add(`${dockerfileKey}.template`);
      } else {
        out.unapproximated.add(input.key);
      }
    } else if (input.kind === "upstream") {
      const upstream = byRef.get(input.key);
      if (!upstream) continue;
      const nested = historicalPaths(upstream, byRef, contextDir);
      nested.paths.forEach((p) => out.paths.add(p));
      nested.workspaces.forEach((p) => out.workspaces.add(p));
      out.usesLock ||= nested.usesLock;
      nested.unapproximated.forEach((p) => out.unapproximated.add(p));
    }
  }
  return out;
}

/**
 * Resolves context-relative paths to object hashes at a commit of the
 * context's repo, following submodule gitlinks for paths in nested repos.
 */
class HistoricalResolver {
  private readonly nested = new Map<
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
      let loc = this.nested.get(p);
      if (!loc) {
        loc = this.locate(p);
        this.nested.set(p, loc);
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
      if (gitlink && !nested?.result)
        this.unknownCommits.add(`${gitlinkPath}@${gitlink}`);
      group.contextPaths.forEach((key, i) => {
        // An unknown submodule commit (not fetched) reads as "changed".
        const hash = nested?.result?.get(group.repoRelative[i]);
        out.set(key, hash === undefined ? `unknown:${gitlink}` : hash);
      });
    }
    return out;
  }
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
    ...historicalPaths(r, byRef, contextDir),
  }));
  const allPaths = Array.from(
    new Set(perBuild.flatMap((b) => [...b.paths])),
  ).sort();

  const resolver = new HistoricalResolver(contextDir, contextRepo);
  // Oldest first.
  const ordered = commits.slice().reverse();
  const snapshots = ordered.map((c) => resolver.hashesAt(c.hash, allPaths));
  const locks = lockHistory(
    contextRepo,
    path.relative(contextRepo, contextDir),
    ordered,
  );

  const builds: BuildSkipRate[] = perBuild.map((b) => ({
    ref: b.ref,
    rebuilds: 0,
    lockfileOnlyRebuilds: 0,
    rebuildsWithDevPrunedLock: 0,
    rebuildsWithClosureLock: 0,
    sourceOnlyRebuilds: 0,
    unapproximated: Array.from(b.unapproximated).sort(),
  }));
  let commitsWithAnyRebuild = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const next = snapshots[i];
    const changed = (p: string) => prev.get(p) !== next.get(p);
    let any = false;
    const stagedChanged = locks[i].staged !== locks[i - 1].staged;
    const closureChanged = (b: (typeof perBuild)[number]) =>
      closureHash(locks[i], b.workspaces) !==
      closureHash(locks[i - 1], b.workspaces);
    const devPrunedChanged = locks[i].devPruned !== locks[i - 1].devPruned;
    perBuild.forEach((b, j) => {
      const sourceChanged = [...b.paths].some(changed);
      if (sourceChanged) builds[j].sourceOnlyRebuilds++;
      if (sourceChanged || (b.usesLock && devPrunedChanged)) {
        builds[j].rebuildsWithDevPrunedLock++;
      }
      if (sourceChanged || (b.usesLock && closureChanged(b))) {
        builds[j].rebuildsWithClosureLock++;
      }
      if (sourceChanged || (b.usesLock && stagedChanged)) {
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

/** {@link lockVariants} at each commit, reading each distinct blob once. */
function lockHistory(
  repoRoot: string,
  contextRelative: string,
  commits: GitCommit[],
): LockVariants[] {
  const pj = path.posix.join(
    contextRelative.split(path.sep).join("/"),
    "package.json",
  );
  const lock = path.posix.join(
    contextRelative.split(path.sep).join("/"),
    "package-lock.json",
  );
  const blobPairs = commits.map((c) => {
    const { result, error } = objectHashesAt(repoRoot, c.hash, [pj, lock]);
    if (error) throw error;
    return [result.get(pj) ?? null, result.get(lock) ?? null] as const;
  });
  const { result: blobs, error } = readBlobs(
    repoRoot,
    blobPairs.flatMap((pair) => pair.filter((h): h is string => h !== null)),
  );
  if (error) throw error;
  const cache = new Map<string, LockVariants>();
  return blobPairs.map(([pjHash, lockHash]) => {
    const key = `${pjHash}:${lockHash}`;
    let variants = cache.get(key);
    if (!variants) {
      variants =
        pjHash && lockHash
          ? lockVariants(blobs.get(pjHash) ?? "{}", blobs.get(lockHash) ?? "{}")
          : { staged: key, devPruned: key };
      cache.set(key, variants);
    }
    return variants;
  });
}
