import type { Command } from "commander";
import { runImageBuild } from "../../src/run-build.ts";

interface BuildCommandOptions {
  dir?: string[];
  compose?: string[];
  platform: string;
  registry?: string;
  push?: boolean;
  force?: boolean;
  dryRun?: boolean;
  concurrency: string;
}

async function runBuild(
  identifiers: string[],
  options: BuildCommandOptions,
  dryRun: boolean,
): Promise<void> {
  const { ok } = await runImageBuild({
    identifiers,
    dirs: options.dir,
    composeFiles: options.compose,
    platform: options.platform,
    registry: options.registry,
    push: options.push,
    force: options.force,
    dryRun,
    concurrency: Number(options.concurrency),
  });
  if (!ok) process.exitCode = 1;
}

function addSharedOptions(command: Command): Command {
  return command
    .argument(
      "[builds...]",
      "build refs (@pkg/builds/<name>) or package names; default: all builds",
    )
    .option(
      "--dir <path>",
      "also select every build under this directory (repeatable)",
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    )
    .option(
      "--compose <file>",
      "also select every build whose image this compose file uses (repeatable)",
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    )
    .option(
      "--platform <platform>",
      "native (default), amd64, arm64, or os/arch",
      "native",
    )
    .option(
      "--registry <registry>",
      "registry prefix to look for (and push) images, e.g. ghcr.io/org",
    );
}

export const addBuildCommand = (program: Command) => {
  addSharedOptions(
    program
      .command("build")
      .description(
        "Build images whose inputs changed (and their upstream builds), skipping any whose input-tagged image already exists locally or in --registry. Tags in-<hash>, latest, and build.json tags.",
      ),
  )
    .option("--push", "push images to --registry")
    .option("--force", "rebuild even when an up-to-date image exists")
    .option("--dry-run", "only report what would happen (same as `status`)")
    .option("--concurrency <n>", "max concurrent docker builds", "4")
    .action((identifiers: string[], options: BuildCommandOptions) =>
      runBuild(identifiers, options, !!options.dryRun),
    );
};

export const addStatusCommand = (program: Command) => {
  addSharedOptions(
    program
      .command("status")
      .description(
        "Show which images `saf-docker build` would build, pull, or skip (no changes made).",
      ),
  ).action((identifiers: string[], options: BuildCommandOptions) =>
    runBuild(identifiers, { ...options, concurrency: "4" }, true),
  );
};
