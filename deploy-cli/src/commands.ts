import type { Command } from "commander";
import { runImageBuild, runManifestPublish } from "@saflib/docker/run-build";
import {
  loadDeployConfig,
  requireRegistry,
  type DeployConfig,
} from "./config.ts";
import { readRemoteScript, runRemote, type RemoteScript } from "./remote.ts";

export interface ImageCommandOptions {
  /** Overrides `SAF_DEPLOY_PLATFORMS` (see {@link deployPlatforms}). */
  platform?: string;
  /** False (`--no-manifest`): push input tags only; see `saf-deploy manifest`. */
  manifest?: boolean;
  force?: boolean;
  concurrency?: string;
}

/**
 * The platforms production images are built for: `--platform`, else
 * `SAF_DEPLOY_PLATFORMS` from env.remote (comma-separated, e.g.
 * `amd64,arm64` while hosts of both architectures run the stack), else
 * `amd64`.
 */
export function deployPlatforms(
  config: DeployConfig,
  option?: string,
): string {
  return option || config.env.SAF_DEPLOY_PLATFORMS || "amd64";
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
    composeFiles: config.composeFiles,
    platform: deployPlatforms(config, options.platform),
    manifest: options.manifest,
    registry,
    push: options.push,
    force: options.force,
    dryRun: options.dryRun,
    concurrency: options.concurrency ? Number(options.concurrency) : undefined,
  });
  if (!ok) throw new Error("Image build failed");
}

/**
 * Points the production images' `latest` (and `build.json` tags) at
 * manifest lists of each platform's already-pushed image.
 */
export async function publishProductionManifests(
  config: DeployConfig,
  options: { platform?: string; dryRun?: boolean },
): Promise<void> {
  const registry = requireRegistry(config);
  const ok = await runManifestPublish({
    cwd: config.deployDir,
    composeFiles: config.composeFiles,
    platform: deployPlatforms(config, options.platform),
    registry,
    dryRun: options.dryRun,
  });
  if (!ok) throw new Error("Publishing manifests failed");
}

/** Shared options for commands that build images. */
export function imageOptions(command: Command): Command {
  return command
    .option(
      "--platform <platforms>",
      "amd64, arm64, native, os/arch, or a comma-separated list for multi-arch images (default: SAF_DEPLOY_PLATFORMS from env.remote, else amd64)",
    )
    .option(
      "--no-manifest",
      "with several platforms, don't publish multi-arch tags afterwards; with one, push only its input-tagged images (for a per-arch CI job; then run `saf-deploy manifest`)",
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
