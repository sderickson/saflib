import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";

export interface DockerBuildOptions {
  /** Build context (the monorepo root). */
  contextDir: string;
  dockerfile: string;
  /** Every tag to apply, local and/or registry-qualified. */
  tags: string[];
  /** Omitted for the server's native platform. */
  platform?: string;
  buildArgs: Record<string, string>;
  labels: Record<string, string>;
  /** BuildKit secret values by id (passed via the process env, not args). */
  secrets?: Record<string, string>;
  /** Build output is written here rather than to the console. */
  logFile: string;
  /** Called as BuildKit starts each Dockerfile step. */
  onProgress?: (progress: BuildProgress) => void;
}

export interface BuildProgress {
  /** Steps started so far (across all stages seen so far). */
  done: number;
  /** Total steps of the stages seen so far. */
  total: number;
  /** Finished steps BuildKit took from its cache. */
  cached: number;
  /** Finished steps that actually ran. */
  executed: number;
  /** The most recently started step, e.g. `RUN npm ci`. */
  step: string;
}

/** What a finished `docker build` reports. */
export interface BuildStats {
  totalSteps: number;
  cachedSteps: number;
  executedSteps: number;
  /** Docker Desktop's build details link, when Docker Desktop is the engine. */
  detailsUrl?: string;
}

/** The `View build details: docker-desktop://…` link in build output. */
export function findBuildDetailsUrl(output: string): string | undefined {
  return output.match(/View build details: (\S+)/)?.[1];
}

/**
 * Parses a BuildKit `--progress=plain` step line, e.g.
 * `#7 [builder 3/6] RUN npm ci` → `{ stage: "builder", index: 3, count: 6 }`.
 */
export function parseBuildkitStep(
  line: string,
): { stage: string; index: number; count: number; step: string } | undefined {
  const match = line.match(/^#\d+ \[(?:(\S+)\s+)?(\d+)\/(\d+)\] (.*)$/);
  if (!match) return undefined;
  return {
    stage: match[1] ?? "",
    index: Number(match[2]),
    count: Number(match[3]),
    step: match[4].trim(),
  };
}

/**
 * Turns a stream of BuildKit `--progress=plain` lines into
 * {@link BuildProgress}: steps start on `#N [stage i/n] …` and finish on
 * `#N CACHED` (from cache) or `#N DONE` (ran). `stats()` gives the totals.
 */
export function buildkitProgressTracker(
  onProgress: (progress: BuildProgress) => void = () => {},
): ((line: string) => void) & { stats: () => BuildStats } {
  const stageCounts = new Map<string, number>();
  const started = new Set<string>();
  /** BuildKit vertex id (`#7`) → step key, for steps (not internal work). */
  const vertexStep = new Map<string, string>();
  const cached = new Set<string>();
  const executed = new Set<string>();
  let lastStep = "";
  let detailsUrl: string | undefined;

  const progress = (): BuildProgress => ({
    done: started.size,
    total: [...stageCounts.values()].reduce((a, b) => a + b, 0),
    cached: cached.size,
    executed: executed.size,
    step: lastStep,
  });

  const track = (line: string) => {
    detailsUrl ??= findBuildDetailsUrl(line);
    const parsed = parseBuildkitStep(line);
    if (parsed) {
      stageCounts.set(parsed.stage, parsed.count);
      const key = `${parsed.stage}\t${parsed.index}`;
      vertexStep.set(line.slice(1, line.indexOf(" ")), key);
      if (started.has(key)) return;
      started.add(key);
      lastStep = parsed.step;
      onProgress(progress());
      return;
    }
    const finished = line.match(/^#(\d+) (CACHED|DONE\b)/);
    const key = finished && vertexStep.get(finished[1]);
    if (!key || cached.has(key) || executed.has(key)) return;
    (finished[2] === "CACHED" ? cached : executed).add(key);
    onProgress(progress());
  };
  return Object.assign(track, {
    stats: (): BuildStats => ({
      totalSteps: progress().total,
      cachedSteps: cached.size,
      executedSteps: executed.size,
      detailsUrl,
    }),
  });
}

/**
 * The docker operations `saf-docker build` needs. Swapped for a fake in tests.
 */
export interface DockerExecutor {
  /** The daemon's platform, e.g. `linux/arm64`. */
  serverPlatform(): Promise<string>;
  localImageExists(ref: string): Promise<boolean>;
  remoteImageExists(ref: string): Promise<boolean>;
  tag(source: string, target: string): Promise<void>;
  /** Adds a tag to an image already in the registry, without pulling it. */
  remoteTag(source: string, target: string): Promise<void>;
  pull(ref: string, platform?: string): Promise<void>;
  push(ref: string): Promise<void>;
  build(options: DockerBuildOptions): Promise<BuildStats>;
}

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

interface RunOptions {
  cwd?: string;
  /** Extra environment for the docker process. */
  env?: Record<string, string>;
  logFile?: string;
  /** Receives each complete output line (when logging to a file). */
  onLine?: (line: string) => void;
}

function run(args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      cwd: options.cwd,
      env: { ...process.env, DOCKER_BUILDKIT: "1", ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const log = options.logFile
      ? (mkdirSync(path.dirname(options.logFile), { recursive: true }),
        createWriteStream(options.logFile))
      : undefined;
    let partial = "";
    const toLog = (chunk: Buffer) => {
      log!.write(chunk);
      if (!options.onLine) return;
      const lines = (partial + chunk.toString()).split("\n");
      partial = lines.pop() ?? "";
      lines.forEach((line) => options.onLine!(line));
    };
    child.stdout.on("data", (chunk: Buffer) => {
      if (log) toLog(chunk);
      else stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (log) toLog(chunk);
      else stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      log?.end();
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function runOrThrow(
  args: string[],
  options: RunOptions = {},
): Promise<string> {
  const result = await run(args, options);
  if (result.code !== 0) {
    const detail = options.logFile
      ? `see ${options.logFile}`
      : result.stderr.trim() || result.stdout.trim();
    throw new Error(
      `docker ${args[0]} failed (exit ${result.code}): ${detail}`,
    );
  }
  return result.stdout.trim();
}

/**
 * `docker build` arguments for {@link DockerBuildOptions}. Secret values go
 * in the returned env (`--secret id=…,env=SAF_BUILD_SECRET_n`), never in the
 * arguments, which other processes can see.
 */
export function dockerBuildCommand(options: DockerBuildOptions): {
  args: string[];
  env: Record<string, string>;
} {
  const args = ["build", "--progress=plain", "-f", options.dockerfile];
  if (options.platform) args.push("--platform", options.platform);
  for (const tag of options.tags) args.push("-t", tag);
  for (const [key, value] of Object.entries(options.buildArgs)) {
    args.push("--build-arg", `${key}=${value}`);
  }
  for (const [key, value] of Object.entries(options.labels)) {
    args.push("--label", `${key}=${value}`);
  }
  const env: Record<string, string> = {};
  Object.entries(options.secrets ?? {}).forEach(([id, value], i) => {
    const name = `SAF_BUILD_SECRET_${i}`;
    env[name] = value;
    args.push("--secret", `id=${id},env=${name}`);
  });
  args.push(".");
  return { args, env };
}

/** {@link DockerExecutor} backed by the `docker` CLI (with buildx). */
export const dockerCli: DockerExecutor = {
  serverPlatform: () =>
    runOrThrow(["version", "--format", "{{.Server.Os}}/{{.Server.Arch}}"]),
  localImageExists: async (ref) =>
    (await run(["image", "inspect", "--format", "{{.Id}}", ref])).code === 0,
  remoteImageExists: async (ref) =>
    (await run(["buildx", "imagetools", "inspect", ref])).code === 0,
  tag: async (source, target) => {
    await runOrThrow(["tag", source, target]);
  },
  remoteTag: async (source, target) => {
    await runOrThrow(["buildx", "imagetools", "create", "-t", target, source]);
  },
  pull: async (ref, platform) => {
    await runOrThrow([
      "pull",
      ...(platform ? ["--platform", platform] : []),
      ref,
    ]);
  },
  push: async (ref) => {
    await runOrThrow(["push", ref]);
  },
  build: async (options) => {
    const { args, env } = dockerBuildCommand(options);
    const tracker = buildkitProgressTracker(options.onProgress);
    await runOrThrow(args, {
      cwd: options.contextDir,
      logFile: options.logFile,
      onLine: tracker,
      env,
    });
    return tracker.stats();
  },
};
