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
  /** The step just started, e.g. `RUN npm ci`. */
  step: string;
}

/**
 * Parses a BuildKit `--progress=plain` step line, e.g.
 * `#7 [builder 3/6] RUN npm ci` → `{ stage: "builder", index: 3, count: 6 }`.
 */
export function parseBuildkitStep(
  line: string,
): { stage: string; index: number; count: number; step: string } | undefined {
  const match = line.match(/^#\d+ \[(?:(\S+) )?(\d+)\/(\d+)\] (.*)$/);
  if (!match) return undefined;
  return {
    stage: match[1] ?? "",
    index: Number(match[2]),
    count: Number(match[3]),
    step: match[4].trim(),
  };
}

/** Turns a stream of BuildKit output lines into {@link BuildProgress}. */
export function buildkitProgressTracker(
  onProgress: (progress: BuildProgress) => void,
): (line: string) => void {
  const stageCounts = new Map<string, number>();
  const started = new Set<string>();
  return (line) => {
    const parsed = parseBuildkitStep(line);
    if (!parsed) return;
    stageCounts.set(parsed.stage, parsed.count);
    const key = `${parsed.stage}\t${parsed.index}`;
    if (started.has(key)) return;
    started.add(key);
    onProgress({
      done: started.size,
      total: [...stageCounts.values()].reduce((a, b) => a + b, 0),
      step: parsed.step,
    });
  };
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
  build(options: DockerBuildOptions): Promise<void>;
}

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

interface RunOptions {
  cwd?: string;
  logFile?: string;
  /** Receives each complete output line (when logging to a file). */
  onLine?: (line: string) => void;
}

function run(args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      cwd: options.cwd,
      env: { ...process.env, DOCKER_BUILDKIT: "1" },
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
    const args = ["build", "--progress=plain", "-f", options.dockerfile];
    if (options.platform) args.push("--platform", options.platform);
    for (const tag of options.tags) args.push("-t", tag);
    for (const [key, value] of Object.entries(options.buildArgs)) {
      args.push("--build-arg", `${key}=${value}`);
    }
    for (const [key, value] of Object.entries(options.labels)) {
      args.push("--label", `${key}=${value}`);
    }
    args.push(".");
    await runOrThrow(args, {
      cwd: options.contextDir,
      logFile: options.logFile,
      onLine: options.onProgress
        ? buildkitProgressTracker(options.onProgress)
        : undefined,
    });
  },
};
