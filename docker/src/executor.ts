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

function run(
  args: string[],
  options: { cwd?: string; logFile?: string } = {},
): Promise<RunResult> {
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
    child.stdout.on("data", (chunk: Buffer) => {
      if (log) log.write(chunk);
      else stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (log) log.write(chunk);
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
  options: { cwd?: string; logFile?: string } = {},
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
    const args = ["build", "-f", options.dockerfile];
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
    });
  },
};
