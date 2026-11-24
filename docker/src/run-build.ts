import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { repoRootFor, resolveRef } from "@saflib/git";
import {
  buildMonorepoContext,
  findMonorepoRoot,
} from "@saflib/monorepo/workspace";
import { buildImages, type BuildResult } from "./build-images.ts";
import { publishManifests, resolvePlatforms } from "./manifests.ts";

const resolvePlatformName = (p: string) => resolvePlatforms([p])[0];
import { formatBuildReport } from "./build-report.ts";
import { generateDockerfiles } from "./docker.ts";
import { dockerCli } from "./executor.ts";
import { findSaflibDir } from "./git-hashes.ts";
import { cleanupImages } from "./cleanup.ts";
import { createReporter } from "./reporter.ts";

/** Input-tagged versions kept per image and architecture after a build. */
export const DEFAULT_KEEP_IMAGES = 2;
import { selectBuilds, type BuildSelection } from "./select.ts";

export interface RunImageBuildOptions extends BuildSelection {
  /**
   * `native` (default), `amd64`, `arm64`, or `os/arch`; or a comma-separated
   * list (`amd64,arm64`) for a multi-arch build: each platform is built in
   * turn under its input tag only, then (when pushing) `latest` and
   * `build.json` tags become manifest lists of every platform's image.
   */
  platform?: string;
  /**
   * False: don't publish manifest lists after a multi-arch push, and for a
   * single platform, push only the input tag. For CI jobs that each build
   * one architecture, followed by {@link runManifestPublish}.
   */
  manifest?: boolean;
  registry?: string;
  push?: boolean;
  force?: boolean;
  dryRun?: boolean;
  concurrency?: number;
  /**
   * After building, untag older input-tagged versions of the images this run
   * handled, keeping this many per image and architecture (plus the current
   * ones). `false` disables cleanup. Default 2.
   */
  keepImages?: number | false;
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
  const prepareStarted = Date.now();
  const ctx = buildMonorepoContext(
    findMonorepoRoot(options.cwd ?? process.cwd()),
  );
  const all = generateDockerfiles(ctx);
  const selected = selectBuilds(all, options);
  const prepareMs = Date.now() - prepareStarted;
  const startedAt = new Date();
  const platforms = parsePlatformList(options.platform);
  const multiArch = platforms.length > 1;
  if (multiArch) {
    // Native last, so local `latest` tags end up runnable on this machine.
    const native = await dockerCli.serverPlatform();
    const isNative = (p: string) =>
      p === "native" || resolvePlatformName(p) === native;
    platforms.sort((a, b) => Number(isNative(a)) - Number(isNative(b)));
  }
  const movingTags = !multiArch && options.manifest !== false;
  const results: BuildResult[] = [];
  for (const platform of platforms) {
    if (multiArch) console.log(`\n== ${platform}`);
    const reporter = createReporter();
    results.push(
      ...(await buildImages({
        contextDir: ctx.rootDir,
        builds: all,
        selected,
        platform,
        registry: options.registry,
        push: options.push,
        movingTags,
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
        prepareMs,
      }).finally(() => reporter.close())),
    );
  }

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
  const keep = options.keepImages ?? DEFAULT_KEEP_IMAGES;
  if (!options.dryRun && keep !== false) {
    const { removed, skipped } = await cleanupImages(
      dockerCli,
      results.map((r) => r.image),
      keep,
      new Set(results.map((r) => r.tag)),
    );
    console.log(
      `Cleanup: removed ${removed.length} old image tag(s), keeping the newest ${keep} per image and architecture` +
        (skipped.length ? ` (${skipped.length} in use, left alone)` : ""),
    );
  }

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

  if (
    multiArch &&
    options.push &&
    options.manifest !== false &&
    failed === 0 &&
    !options.dryRun
  ) {
    console.log("");
    const ok = await runManifestPublish({ ...options, ctx, all, selected });
    return { ok, results };
  }
  return { ok: failed === 0, results };
}

/** `amd64,arm64` → `["amd64", "arm64"]`; nothing → `["native"]`. */
export function parsePlatformList(platform: string | undefined): string[] {
  const list = (platform ?? "native")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return list.length > 0 ? [...new Set(list)] : ["native"];
}

export interface RunManifestPublishOptions extends BuildSelection {
  /** Comma-separated platforms whose images to combine, e.g. `amd64,arm64`. */
  platform?: string;
  registry?: string;
  dryRun?: boolean;
}

/**
 * Publishes multi-arch moving tags (`latest`, `build.json` tags) for the
 * selected builds, from each platform's already-pushed input-tagged image.
 * Resolves false (after printing why) if any platform's image is missing.
 */
export async function runManifestPublish(
  options: RunManifestPublishOptions & {
    ctx?: ReturnType<typeof buildMonorepoContext>;
    all?: ReturnType<typeof generateDockerfiles>;
    selected?: ReturnType<typeof selectBuilds>;
  },
): Promise<boolean> {
  if (!options.registry) throw new Error("Publishing manifests needs a registry");
  const ctx =
    options.ctx ??
    buildMonorepoContext(findMonorepoRoot(options.cwd ?? process.cwd()));
  const all = options.all ?? generateDockerfiles(ctx);
  const selected = options.selected ?? selectBuilds(all, options);
  const platforms = parsePlatformList(options.platform);
  if (platforms.includes("native")) {
    throw new Error(
      "Manifests need explicit platforms, e.g. --platform amd64,arm64",
    );
  }
  console.log(
    `Publishing multi-arch tags (${platforms.join(", ")})${options.dryRun ? " (dry run)" : ""}…`,
  );
  try {
    const published = await publishManifests({
      contextDir: ctx.rootDir,
      builds: all,
      selected,
      platforms,
      registry: options.registry,
      executor: dockerCli,
      dryRun: options.dryRun,
      onPublished: (m) => console.log(`  ${m.image}: ${m.tags.join(", ")}`),
    });
    console.log(`Done: ${published.length} image(s)`);
    return true;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}
