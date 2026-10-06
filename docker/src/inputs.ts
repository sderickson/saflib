import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { listIgnored, repoRootFor, workingTreeHashes } from "@saflib/git";
import type { Build } from "./builds.ts";
import { DockerIgnore } from "./dockerignore.ts";

/**
 * Bump to invalidate every input hash (e.g. when what counts as an input, or
 * how it's hashed, changes).
 */
export const HASH_SCHEMA_VERSION = 1;

export type BuildInputKind =
  /** Content-addressed by git (tree or blob hash, working tree included). */
  | "git"
  /** Not visible to git (generated / gitignored); sha256 of the bytes on disk. */
  | "file"
  /** Another build this one consumes via `FROM` / `COPY --from`. */
  | "upstream"
  | "scalar";

export interface BuildInput {
  kind: BuildInputKind;
  /** Context-relative path, build ref (upstream), or name (scalar). */
  key: string;
  hash: string;
}

export interface BuildInputs {
  build: Build;
  inputs: BuildInput[];
  /** sha256 over the canonical input list. */
  inputHash: string;
  /** `true` if any git input has uncommitted changes. */
  dirty: boolean;
  /**
   * `FROM` / `COPY --from` image references that are neither a stage in the
   * same Dockerfile nor a known build. Usually public base images (whose tag
   * is already covered by the Dockerfile's hash); a local image here means an
   * upstream build the hash can't see.
   */
  externalImages: string[];
  /**
   * Files that land in the build context under a git input but are invisible
   * to git (gitignored, not dockerignored). Changes to these won't change the
   * input hash.
   */
  gitInvisibleContextFiles: string[];
}

export interface ComputeInputsOptions {
  /** Docker build context; the monorepo root. */
  contextDir: string;
  /** All known builds, for resolving upstream references. */
  builds: Build[];
  /** Target platform, e.g. `linux/amd64`; `native` for the host's. */
  platform?: string;
  /** Skip the (slower) git-invisible context file audit. */
  skipAudit?: boolean;
}

/**
 * Gitignored files the audit expects in the context: generated Dockerfiles
 * (each build's own is a `file` input already), and `git-hashes.json`, which
 * `saf-git-hashes` writes before every build (retired by build metadata).
 */
const AUDIT_EXEMPT_BASENAMES = new Set([
  "Dockerfile",
  "Dockerfile.dockerignore",
  "git-hashes.json",
]);

export interface Instruction {
  keyword: string;
  args: string;
}

/** Splits a Dockerfile into instructions, joining `\` continuations. */
export function parseInstructions(dockerfile: string): Instruction[] {
  const instructions: Instruction[] = [];
  let current = "";
  for (const rawLine of dockerfile.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (current === "" && /^\s*(#|$)/.test(line)) continue;
    if (line.endsWith("\\")) {
      current += line.slice(0, -1) + " ";
      continue;
    }
    current += line;
    const match = current.trim().match(/^(\S+)\s*(.*)$/s);
    if (match) {
      instructions.push({ keyword: match[1].toUpperCase(), args: match[2] });
    }
    current = "";
  }
  return instructions;
}

function splitFlags(args: string): { flags: string[]; rest: string } {
  const flags: string[] = [];
  let rest = args.trim();
  while (rest.startsWith("--")) {
    const match = rest.match(/^(\S+)\s*(.*)$/s)!;
    flags.push(match[1]);
    rest = match[2];
  }
  return { flags, rest };
}

const GLOB_CHARS = /[*?[]/;

/**
 * Context-relative source paths of every `COPY` / `ADD` that reads from the
 * build context (`--from` copies and heredocs are skipped). Glob sources are
 * widened to their non-glob directory prefix; `.` becomes `""` (the whole
 * context).
 */
export function parseContextSources(dockerfile: string): string[] {
  const sources = new Set<string>();
  for (const { keyword, args } of parseInstructions(dockerfile)) {
    if (keyword !== "COPY" && keyword !== "ADD") continue;
    const { flags, rest } = splitFlags(args);
    if (flags.some((f) => f.startsWith("--from="))) continue;
    if (rest.includes("<<")) continue;
    let tokens: string[];
    if (rest.startsWith("[")) {
      tokens = JSON.parse(rest) as string[];
    } else {
      tokens = rest.split(/\s+/).filter(Boolean);
    }
    for (const token of tokens.slice(0, -1)) {
      if (/^[a-z]+:\/\//i.test(token)) continue; // ADD <url>
      let source = path.posix.normalize(token).replace(/\/+$/, "");
      if (GLOB_CHARS.test(source)) {
        const segments = source.split("/");
        const firstGlob = segments.findIndex((s) => GLOB_CHARS.test(s));
        source = segments.slice(0, firstGlob).join("/");
      }
      sources.add(source === "." ? "" : source.replace(/^\.\//, ""));
    }
  }
  return Array.from(sources).sort();
}

/**
 * Image references a Dockerfile pulls in (`FROM <image>`, `COPY --from=<image>`),
 * excluding references to its own named stages and `scratch`.
 */
export function parseImageReferences(dockerfile: string): string[] {
  const stages = new Set<string>();
  const images = new Set<string>();
  const consider = (ref: string) => {
    if (
      ref !== "scratch" &&
      !stages.has(ref.toLowerCase()) &&
      !/^\d+$/.test(ref)
    ) {
      images.add(ref);
    }
  };
  for (const { keyword, args } of parseInstructions(dockerfile)) {
    if (keyword === "FROM") {
      const { rest } = splitFlags(args);
      const [image, as, stage] = rest.split(/\s+/);
      consider(image);
      if (as?.toUpperCase() === "AS" && stage) stages.add(stage.toLowerCase());
    } else if (keyword === "COPY" || keyword === "ADD") {
      const from = splitFlags(args).flags.find((f) => f.startsWith("--from="));
      if (from) consider(from.slice("--from=".length));
    }
  }
  return Array.from(images).sort();
}

function imageName(ref: string): string {
  const withoutDigest = ref.split("@")[0];
  const lastSlash = withoutDigest.lastIndexOf("/");
  const colon = withoutDigest.indexOf(":", lastSlash + 1);
  return colon === -1 ? withoutDigest : withoutDigest.slice(0, colon);
}

/** sha256 over file paths + bytes under `absPath`, honoring `.dockerignore`. */
function hashFromDisk(
  contextDir: string,
  absPath: string,
  dockerIgnore: DockerIgnore,
): string {
  const hash = createHash("sha256");
  const visit = (abs: string) => {
    const rel = path.relative(contextDir, abs).split(path.sep).join("/");
    if (rel !== "" && dockerIgnore.ignores(rel)) return;
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(abs).sort()) visit(path.join(abs, entry));
    } else if (stat.isFile()) {
      hash.update(`${rel}\0${stat.size}\0`);
      hash.update(readFileSync(abs));
    }
  };
  visit(absPath);
  return hash.digest("hex");
}

/**
 * Whether any non-exempt file at/under `relativePath` survives
 * `.dockerignore` (a collapsed ignored directory may hold only dockerignored
 * or exempt content).
 */
function reachesContext(
  contextDir: string,
  relativePath: string,
  dockerIgnore: DockerIgnore,
): boolean {
  if (dockerIgnore.ignores(relativePath)) return false;
  const abs = path.join(contextDir, relativePath);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    return !AUDIT_EXEMPT_BASENAMES.has(path.posix.basename(relativePath));
  }
  return readdirSync(abs).some((entry) =>
    reachesContext(
      contextDir,
      path.posix.join(relativePath, entry),
      dockerIgnore,
    ),
  );
}

export function combineInputs(inputs: BuildInput[]): string {
  const hash = createHash("sha256");
  for (const input of [...inputs].sort((a, b) =>
    `${a.kind}\t${a.key}`.localeCompare(`${b.kind}\t${b.key}`),
  )) {
    hash.update(`${input.kind}\t${input.key}\t${input.hash}\n`);
  }
  return hash.digest("hex");
}

/**
 * Computes every input of `build` and its input hash. Expects the build's
 * `Dockerfile` (and `.saf-docker/stage/`) to already be generated.
 *
 * Inputs: each context source the Dockerfile copies (hashed by git when
 * git can see it, from disk otherwise — e.g. the staged install manifests),
 * the generated Dockerfile itself (which also pins external base image
 * tags), the input hash of each upstream build, the platform, and
 * {@link HASH_SCHEMA_VERSION}.
 */
export function computeBuildInputs(
  build: Build,
  options: ComputeInputsOptions,
  memo: Map<string, BuildInputs> = new Map(),
  visiting: Set<string> = new Set(),
): BuildInputs {
  const cached = memo.get(build.ref);
  if (cached) return cached;
  if (visiting.has(build.ref)) {
    throw new Error(`Cycle in upstream builds at ${build.ref}`);
  }
  visiting.add(build.ref);

  const { contextDir, builds } = options;
  if (!existsSync(build.dockerfilePath)) {
    throw new Error(
      `${build.ref}: ${path.relative(contextDir, build.dockerfilePath)} not found; run \`saf-docker generate\` first`,
    );
  }
  const dockerfile = readFileSync(build.dockerfilePath, "utf8");
  const dockerIgnore = DockerIgnore.forBuild(contextDir, build.dockerfilePath);

  const inputs: BuildInput[] = [
    { kind: "scalar", key: "schema", hash: String(HASH_SCHEMA_VERSION) },
    { kind: "scalar", key: "platform", hash: options.platform ?? "native" },
    {
      kind: "file",
      key: path
        .relative(contextDir, build.dockerfilePath)
        .split(path.sep)
        .join("/"),
      hash: createHash("sha256").update(dockerfile).digest("hex"),
    },
  ];
  // The context's ignore rules decide what COPY sources contain.
  const rootIgnore = path.join(contextDir, ".dockerignore");
  if (existsSync(rootIgnore)) {
    inputs.push({
      kind: "file",
      key: ".dockerignore",
      hash: createHash("sha256").update(readFileSync(rootIgnore)).digest("hex"),
    });
  }

  // Group context sources by the (sub)repo that owns them.
  const byRepo = new Map<string, { source: string; repoRelative: string }[]>();
  for (const source of parseContextSources(dockerfile)) {
    const abs = path.join(contextDir, source);
    const { result: repoRoot, error } = repoRootFor(abs);
    if (error) throw error;
    const repoRelative = path.relative(repoRoot, abs).split(path.sep).join("/");
    const group = byRepo.get(repoRoot) ?? [];
    group.push({ source, repoRelative });
    byRepo.set(repoRoot, group);
  }

  let dirty = false;
  const gitInvisibleContextFiles: string[] = [];
  for (const [repoRoot, group] of byRepo) {
    const { result, error } = workingTreeHashes(
      repoRoot,
      group.map((g) => g.repoRelative),
    );
    if (error) throw error;
    dirty ||= result.dirty;

    const gitSourced: string[] = [];
    for (const { source, repoRelative } of group) {
      const gitHash = result.hashes[repoRelative];
      if (gitHash) {
        inputs.push({ kind: "git", key: source, hash: gitHash });
        gitSourced.push(repoRelative);
        continue;
      }
      const abs = path.join(contextDir, source);
      if (!existsSync(abs)) {
        throw new Error(
          `${build.ref}: COPY source ${source || "."} does not exist`,
        );
      }
      inputs.push({
        kind: "file",
        key: source,
        hash: hashFromDisk(contextDir, abs, dockerIgnore),
      });
    }

    if (!options.skipAudit && gitSourced.length > 0) {
      const { result: ignored, error: ignoredError } = listIgnored(
        repoRoot,
        gitSourced,
      );
      if (ignoredError) throw ignoredError;
      for (const repoRelative of ignored) {
        const contextRelative = path
          .relative(contextDir, path.join(repoRoot, repoRelative))
          .split(path.sep)
          .join("/");
        if (reachesContext(contextDir, contextRelative, dockerIgnore)) {
          gitInvisibleContextFiles.push(
            contextRelative + (repoRelative.endsWith("/") ? "/" : ""),
          );
        }
      }
    }
  }

  const externalImages: string[] = [];
  for (const ref of parseImageReferences(dockerfile)) {
    const upstream = builds.find((b) => b.image === imageName(ref));
    if (!upstream) {
      externalImages.push(ref);
      continue;
    }
    const upstreamInputs = computeBuildInputs(
      upstream,
      options,
      memo,
      visiting,
    );
    dirty ||= upstreamInputs.dirty;
    inputs.push({
      kind: "upstream",
      key: upstream.ref,
      hash: upstreamInputs.inputHash,
    });
  }

  const result: BuildInputs = {
    build,
    inputs: inputs.sort((a, b) =>
      `${a.kind}\t${a.key}`.localeCompare(`${b.kind}\t${b.key}`),
    ),
    inputHash: combineInputs(inputs),
    dirty,
    externalImages,
    gitInvisibleContextFiles: gitInvisibleContextFiles.sort(),
  };
  visiting.delete(build.ref);
  memo.set(build.ref, result);
  return result;
}

/** The tag an image built from these inputs carries. */
export function inputTag(inputHash: string): string {
  return `in-${inputHash.slice(0, 16)}`;
}
