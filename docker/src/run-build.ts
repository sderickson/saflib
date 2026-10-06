import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { repoRootFor, resolveRef } from "@saflib/git";
import {
  buildMonorepoContext,
  findMonorepoRoot,
} from "@saflib/monorepo/workspace";
import { buildImages, type BuildResult } from "./build-images.ts";
import { formatBuildReport } from "./build-report.ts";
import { generateDockerfiles } from "./docker.ts";
import { dockerCli } from "./executor.ts";
import { findSaflibDir } from "./git-hashes.ts";
import { createReporter } from "./reporter.ts";
import { selectBuilds, type BuildSelection } from "./select.ts";

export interface RunImageBuildOptions extends BuildSelection {
  /** `native` (default), `amd64`, `arm64`, or `os/arch`. */
  platform?: string;
  registry?: string;
  push?: boolean;
  force?: boolean;
  dryRun?: boolean;
  concurrency?: number;
}

function headOf(dir: string): string {
  const { result: repoRoot } = repoRootFor(dir);
  if (!repoRoot) return "unknown";
  return resolveRef(repoRoot).result ?? "unknown";
}

/**
 * What `saf-docker build` does, as a function other CLIs (e.g. `saf-deploy`)
 * can call: generate Dockerfiles, select builds, build/skip/pull/push them
 * with live progress, and print a summary. Resolves `false` if any build
 * failed or was blocked.
 */
export async function runImageBuild(
  options: RunImageBuildOptions,
): Promise<{ ok: boolean; results: BuildResult[] }> {
  const ctx = buildMonorepoContext(
    findMonorepoRoot(options.cwd ?? process.cwd()),
  );
  const all = generateDockerfiles(ctx);
  const selected = selectBuilds(all, options);
  const reporter = createReporter();
  const startedAt = new Date();
  const results = await buildImages({
    contextDir: ctx.rootDir,
    builds: all,
    selected,
    platform: options.platform,
    registry: options.registry,
    push: options.push,
    force: options.force,
    dryRun: options.dryRun,
    concurrency: options.concurrency,
    executor: dockerCli,
    commits: {
      root: headOf(ctx.rootDir),
      saflib: headOf(findSaflibDir()),
    },
    logDir: path.join(ctx.rootDir, ".saf-docker", "logs"),
    onEvent: (event) => reporter.onEvent(event),
  }).finally(() => reporter.close());

  const count = (o: BuildResult["outcome"]) =>
    results.filter((r) => r.outcome === o).length;
  const failed = count("failed") + count("blocked");
  console.log(
    `\nDone: ${results.length} image(s): ${count("built")} built, ${count("up-to-date")} up to date, ${count("pulled")} pulled, ${count("in-registry")} already in registry` +
      (options.dryRun
        ? `, ${count("would-build")} would build, ${count("would-pull")} would pull`
        : "") +
      (failed > 0
        ? `, ${count("failed")} failed, ${count("blocked")} blocked`
        : ""),
  );
  const reportFile = path.join(ctx.rootDir, ".saf-docker", "build-report.md");
  mkdirSync(path.dirname(reportFile), { recursive: true });
  writeFileSync(
    reportFile,
    formatBuildReport(results, {
      startedAt,
      contextDir: ctx.rootDir,
      platform: options.platform,
      registry: options.registry,
      push: options.push,
      dryRun: options.dryRun,
    }),
  );
  console.log(`Report: ${reportFile}`);
  return { ok: failed === 0, results };
}
