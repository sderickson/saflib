import type { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { repoRootFor, resolveRef } from "@saflib/git";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";
import { generateDockerfiles } from "../../src/docker.ts";
import type { Build } from "../../src/builds.ts";
import { buildImages, type BuildResult } from "../../src/build-images.ts";
import { dockerCli } from "../../src/executor.ts";
import { findSaflibDir } from "../../src/git-hashes.ts";
import { resolveBuilds } from "./inputs.ts";

interface BuildCommandOptions {
  dir?: string[];
  platform: string;
  registry?: string;
  push?: boolean;
  force?: boolean;
  dryRun?: boolean;
  concurrency: string;
}

function headOf(dir: string): string {
  const { result: repoRoot } = repoRootFor(dir);
  if (!repoRoot) return "unknown";
  return resolveRef(repoRoot).result ?? "unknown";
}

/** Builds named on the command line, plus every build under each `--dir`. */
function selectBuilds(
  all: Build[],
  identifiers: string[],
  dirs: string[] | undefined,
): Build[] {
  if (identifiers.length === 0 && !dirs?.length) return all;
  const selected = new Map(
    resolveBuilds(all, identifiers).map((b) => [b.ref, b]),
  );
  for (const dir of dirs ?? []) {
    const abs = path.resolve(dir);
    const under = all.filter(
      (b) => b.dir === abs || b.dir.startsWith(abs + path.sep),
    );
    if (under.length === 0) throw new Error(`No builds under ${dir}`);
    under.forEach((b) => selected.set(b.ref, b));
  }
  return [...selected.values()];
}

const SYMBOLS: Record<BuildResult["outcome"], string> = {
  "up-to-date": "✓ up to date",
  pulled: "↓ pulled    ",
  built: "● built     ",
  failed: "✗ FAILED    ",
  blocked: "✗ blocked   ",
  "would-build": "○ would build",
  "would-pull": "↓ would pull",
};

function printResult(result: BuildResult): void {
  const seconds = (result.durationMs / 1000).toFixed(1);
  console.log(
    `${SYMBOLS[result.outcome]}  ${result.image}:${result.tag}${result.dirty ? " (dirty)" : ""}  ${result.ref}  ${seconds}s`,
  );
  if (result.outcome === "failed") {
    console.log(`    ${result.error}`);
    if (result.logFile && existsSync(result.logFile)) {
      const tail = readFileSync(result.logFile, "utf8")
        .trimEnd()
        .split("\n")
        .slice(-25);
      for (const line of tail) console.log(`    | ${line}`);
    }
  }
}

async function runBuild(
  identifiers: string[],
  options: BuildCommandOptions,
  dryRun: boolean,
): Promise<void> {
  const ctx = buildMonorepoContext();
  const all = generateDockerfiles(ctx);
  const selected = selectBuilds(all, identifiers, options.dir);
  const saflibDir = findSaflibDir();
  const results = await buildImages({
    contextDir: ctx.rootDir,
    builds: all,
    selected,
    platform: options.platform,
    registry: options.registry,
    push: options.push,
    force: options.force,
    dryRun,
    concurrency: Number(options.concurrency),
    executor: dockerCli,
    commits: { root: headOf(ctx.rootDir), saflib: headOf(saflibDir) },
    logDir: path.join(ctx.rootDir, ".saf-docker", "logs"),
    onResult: printResult,
  });
  const count = (o: BuildResult["outcome"]) =>
    results.filter((r) => r.outcome === o).length;
  console.log(
    `\n${results.length} image(s): ${count("built")} built, ${count("up-to-date")} up to date, ${count("pulled")} pulled` +
      (dryRun
        ? `, ${count("would-build")} would build, ${count("would-pull")} would pull`
        : "") +
      (count("failed") + count("blocked") > 0
        ? `, ${count("failed")} failed, ${count("blocked")} blocked`
        : ""),
  );
  if (count("failed") + count("blocked") > 0) process.exitCode = 1;
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
