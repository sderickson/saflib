import type { Command } from "commander";
import { runImageBuild } from "@saflib/docker/run-build";
import {
  loadDeployConfig,
  requireRegistry,
  type DeployConfig,
} from "./config.ts";
import { readRemoteScript, runRemote, type RemoteScript } from "./remote.ts";

export interface ImageCommandOptions {
  platform: string;
  force?: boolean;
  concurrency?: string;
}

/**
 * Builds (and with `push`, publishes) the images the production compose file
 * runs — and whatever they're built from — skipping anything unchanged.
 */
export async function buildProductionImages(
  config: DeployConfig,
  options: ImageCommandOptions & { push?: boolean; dryRun?: boolean },
): Promise<void> {
  const registry = requireRegistry(config);
  console.log(`Container registry: ${registry}`);
  const { ok } = await runImageBuild({
    cwd: config.deployDir,
    composeFiles: [config.composeFile],
    platform: options.platform,
    registry,
    push: options.push,
    force: options.force,
    dryRun: options.dryRun,
    concurrency: options.concurrency ? Number(options.concurrency) : undefined,
  });
  if (!ok) throw new Error("Image build failed");
}

/** Shared options for commands that build images. */
export function imageOptions(command: Command): Command {
  return command
    .option(
      "--platform <platform>",
      "amd64 (default, for production), native, arm64, or os/arch",
      "amd64",
    )
    .option("--force", "rebuild even when an up-to-date image exists")
    .option("--concurrency <n>", "max concurrent docker builds");
}

/** Wraps an action so errors print plainly and set the exit code. */
export function action<A extends unknown[]>(
  fn: (...args: A) => Promise<void>,
): (...args: A) => Promise<void> {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  };
}

/** Adds a command that runs one of the bundled server scripts. */
export function addRemoteScriptCommand(
  program: Command,
  name: string,
  script: RemoteScript,
  description: string,
): void {
  program
    .command(name)
    .description(description)
    .action(
      action(async () => {
        await runRemote(loadDeployConfig(), readRemoteScript(script));
      }),
    );
}
