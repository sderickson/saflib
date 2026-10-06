import path from "node:path";
import type { Build } from "./builds.ts";
import { existsSync, readFileSync } from "node:fs";
import {
  findBuildDetailsUrl,
  type BuildProgress,
  type BuildStats,
  type DockerExecutor,
} from "./executor.ts";
import {
  computeBuildInputs,
  inputTag,
  type BuildInputs,
  type WorkingTreeHashCache,
} from "./inputs.ts";
import { BUILD_INFO_ARG, type BuildInfo } from "./metadata.ts";
import { resolveBuildSecrets } from "./secrets.ts";

export type BuildOutcome =
  /** The input-tagged image was already local; `latest` retagged. */
  | "up-to-date"
  /** Found in the registry and pulled. */
  | "pulled"
  /**
   * Found in the registry; only retagged there (when pushing, an image is
   * pulled only if a build that actually runs needs it).
   */
  | "in-registry"
  | "built"
  | "failed"
  /** Not attempted because an upstream build failed. */
  | "blocked"
  /** Dry run: would be built / pulled. */
  | "would-build"
  | "would-pull";

export interface BuildResult {
  ref: string;
  image: string;
  /** The input tag, `in-<hash>`. */
  tag: string;
  outcome: BuildOutcome;
  durationMs: number;
  /** Whether the image's inputs had uncommitted changes. */
  dirty: boolean;
  error?: string;
  /** Full `docker build` output (built and failed builds). */
  logFile?: string;
  /** Docker Desktop's build details link (built and failed builds). */
  detailsUrl?: string;
  /** Step counts of a finished build: cached vs actually rebuilt. */
  steps?: { total: number; cached: number; executed: number };
}

/** What the check phase decided for an image. */
export type PlannedAction =
  /** `in-<hash>` is local. */
  | "up-to-date"
  /** `in-<hash>` is in the registry. */
  | "in-registry"
  | "build";

export interface PlannedImage {
  ref: string;
  image: string;
  tag: string;
  action: PlannedAction;
  dirty: boolean;
}

export type BuildEvent =
  /** Every image's action is decided (before anything is built). */
  | {
      type: "checked";
      plan: PlannedImage[];
      /** Everything before the first build: the sum of `timings`. */
      durationMs: number;
      timings: CheckTimings;
    }
  /** A build (or a pull) started. */
  | { type: "start"; ref: string; image: string; action: "build" | "pull" }
  | { type: "progress"; ref: string; image: string; progress: BuildProgress }
  /** A pull finished (pulls of `in-registry` images happen on demand). */
  | { type: "pulled"; ref: string; image: string; durationMs: number }
  | { type: "finish"; result: BuildResult };

/** Where the time before the first build went. */
export interface CheckTimings {
  /** Caller's preparation, e.g. generating Dockerfiles (see `prepareMs`). */
  prepareMs: number;
  /** Computing every image's input hash (git + staged files). */
  hashMs: number;
  /** Docker/registry lookups: server platform and image existence. */
  lookupMs: number;
}

export interface BuildImagesOptions {
  contextDir: string;
  /** Every build in the monorepo (for resolving upstreams). */
  builds: Build[];
  /** Builds to produce; their upstream builds are added automatically. */
  selected: Build[];
  /**
   * `native` (default), `amd64`/`linux`/`prod` (= `linux/amd64`), `arm64`,
   * or an explicit `os/arch`.
   */
  platform?: string;
  /** Registry prefix, e.g. `registry.example.com/team`. */
  registry?: string;
  /** Push built/pulled images (requires `registry`). */
  push?: boolean;
  /** Rebuild even when the input-tagged image exists. */
  force?: boolean;
  /** Report what would happen without building, pulling, tagging or pushing. */
  dryRun?: boolean;
  concurrency?: number;
  executor: DockerExecutor;
  /** HEAD commits of the product repo and saflib (recorded in build info). */
  commits: { root: string; saflib: string };
  /** Where each build's output log goes. */
  logDir: string;
  now?: () => Date;
  onResult?: (result: BuildResult) => void;
  onEvent?: (event: BuildEvent) => void;
  /** Time the caller already spent preparing (reported in `checked`). */
  prepareMs?: number;
}

const PLATFORM_ALIASES: Record<string, string> = {
  amd64: "linux/amd64",
  linux: "linux/amd64",
  prod: "linux/amd64",
  arm64: "linux/arm64",
};

/**
 * Resolves a platform option to an explicit `os/arch` (always used for the
 * input hash — `native` would otherwise mean different things on a Mac and
 * a CI runner) and the `--platform` flag to pass (omitted when native).
 */
export function resolvePlatform(
  option: string | undefined,
  serverPlatform: string,
): { platform: string; flag?: string } {
  const raw = option ?? "native";
  const platform = ["native", "mac", "local", "host"].includes(raw)
    ? serverPlatform
    : (PLATFORM_ALIASES[raw] ?? raw);
  if (!/^[a-z0-9]+\/[a-z0-9]+(\/[a-z0-9]+)?$/.test(platform)) {
    throw new Error(`Unrecognized platform "${raw}"`);
  }
  return {
    platform,
    flag: platform === serverPlatform ? undefined : platform,
  };
}

/** `selected` plus every build they (transitively) consume. */
function withUpstreams(
  selected: Build[],
  byRef: Map<string, Build>,
  inputsOf: (build: Build) => BuildInputs,
): Build[] {
  const out = new Map<string, Build>();
  const visit = (build: Build) => {
    if (out.has(build.ref)) return;
    for (const input of inputsOf(build).inputs) {
      if (input.kind === "upstream") visit(byRef.get(input.key)!);
    }
    out.set(build.ref, build);
  };
  selected.forEach(visit);
  return [...out.values()];
}

function semaphore(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((r) => waiting.push(r));
    active++;
    try {
      return await task();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}

/**
 * Builds the selected images (and their upstreams) in dependency order,
 * skipping any whose input-tagged image (`<image>:in-<hash>`) already exists
 * locally or — with a registry — remotely. Every produced image is tagged
 * `in-<hash>`, `latest` and any `build.json` tags, so `latest` always matches
 * the current checkout. Built images get {@link BuildInfo} via
 * `SAF_BUILD_INFO` and OCI labels.
 */
export async function buildImages(
  options: BuildImagesOptions,
): Promise<BuildResult[]> {
  const { executor, contextDir } = options;
  if (options.push && !options.registry) {
    throw new Error("--push requires a registry");
  }
  let lookupMs = 0;
  const timed = async <T>(task: () => Promise<T>): Promise<T> => {
    const started = Date.now();
    try {
      return await task();
    } finally {
      lookupMs += Date.now() - started;
    }
  };
  const serverPlatform = await timed(() => executor.serverPlatform());
  const { platform, flag } = resolvePlatform(options.platform, serverPlatform);

  const byRef = new Map(options.builds.map((b) => [b.ref, b]));
  const memo = new Map<string, BuildInputs>();
  const hashCache: WorkingTreeHashCache = new Map();
  const inputsOf = (build: Build) =>
    computeBuildInputs(
      build,
      {
        contextDir,
        builds: options.builds,
        platform,
        skipAudit: true,
        hashCache,
      },
      memo,
    );
  const hashStarted = Date.now();
  const plan = withUpstreams(options.selected, byRef, inputsOf);
  plan.forEach(inputsOf);
  const hashMs = Date.now() - hashStarted;
  const upstreamsOf = (build: Build) =>
    inputsOf(build)
      .inputs.filter((i) => i.kind === "upstream")
      .map((i) => i.key);

  const registry = options.registry?.replace(/\/+$/, "");
  const remote = (image: string, tag: string) => `${registry}/${image}:${tag}`;
  const limit = semaphore(Math.max(1, options.concurrency ?? 4));
  const emit = (event: BuildEvent) => options.onEvent?.(event);

  // Check phase: an image's input hash doesn't depend on whether its
  // upstreams get rebuilt, so every image's action is known up front.
  const checks = semaphore(8);
  const planned = await timed(() =>
    Promise.all(
      plan.map(async (build): Promise<PlannedImage> => {
        const inputs = inputsOf(build);
        const tag = inputTag(inputs.inputHash);
        const base = {
          ref: build.ref,
          image: build.image,
          tag,
          dirty: inputs.dirty,
        };
        if (options.force) return { ...base, action: "build" };
        if (
          await checks(() => executor.localImageExists(`${build.image}:${tag}`))
        ) {
          return { ...base, action: "up-to-date" };
        }
        if (
          registry &&
          (await checks(() =>
            executor.remoteImageExists(remote(build.image, tag)),
          ))
        ) {
          return { ...base, action: "in-registry" };
        }
        return { ...base, action: "build" };
      }),
    ),
  );
  const actionOf = new Map(planned.map((p) => [p.ref, p.action]));
  const timings = { prepareMs: options.prepareMs ?? 0, hashMs, lookupMs };
  emit({
    type: "checked",
    plan: planned,
    durationMs: timings.prepareMs + timings.hashMs + timings.lookupMs,
    timings,
  });
  const now = options.now ?? (() => new Date());
  const promises = new Map<string, Promise<BuildResult>>();
  /** Pulls an `in-registry` image on first use by a build that runs. */
  const pullers = new Map<string, () => Promise<void>>();

  const run = async (build: Build): Promise<BuildResult> => {
    const upstreamResults = await Promise.all(
      upstreamsOf(build).map((ref) => promises.get(ref)!),
    );
    const inputs = inputsOf(build);
    const tag = inputTag(inputs.inputHash);
    const tags = [tag, "latest", ...build.extraTags];
    const local = `${build.image}:${tag}`;
    const started = Date.now();
    const result = (
      outcome: BuildOutcome,
      extra: Partial<BuildResult> = {},
    ): BuildResult => ({
      ref: build.ref,
      image: build.image,
      tag,
      outcome,
      durationMs: Date.now() - started,
      dirty: inputs.dirty,
      ...extra,
    });

    const failedUpstream = upstreamResults.find(
      (r) => r.outcome === "failed" || r.outcome === "blocked",
    );
    if (failedUpstream) {
      return result("blocked", {
        error: `upstream ${failedUpstream.ref} failed`,
      });
    }

    // With a registry, local images also carry their registry-qualified
    // names, which compose files that reference the registry (e.g. a
    // prod-local stack) run against.
    const tagLocally = async () => {
      for (const t of tags.slice(1)) {
        await executor.tag(local, `${build.image}:${t}`);
      }
      if (registry) {
        for (const t of tags) await executor.tag(local, remote(build.image, t));
      }
    };
    const publish = async () => {
      if (!options.push) return;
      for (const t of tags) await executor.push(remote(build.image, t));
    };

    const action = actionOf.get(build.ref)!;
    try {
      if (action === "up-to-date") {
        if (options.dryRun) return result("up-to-date");
        await tagLocally();
        if (
          options.push &&
          !(await executor.remoteImageExists(remote(build.image, tag)))
        ) {
          await limit(publish);
        } else if (options.push) {
          for (const t of tags.slice(1)) {
            await executor.remoteTag(
              remote(build.image, tag),
              remote(build.image, t),
            );
          }
        }
        return result("up-to-date");
      }

      if (action === "in-registry") {
        if (options.dryRun) return result("would-pull");
        if (options.push) {
          for (const t of tags.slice(1)) {
            await executor.remoteTag(
              remote(build.image, tag),
              remote(build.image, t),
            );
          }
        }
        const pull = async () => {
          const pullStarted = Date.now();
          emit({
            type: "start",
            ref: build.ref,
            image: build.image,
            action: "pull",
          });
          await limit(() => executor.pull(remote(build.image, tag), flag));
          await executor.tag(remote(build.image, tag), local);
          await tagLocally();
          emit({
            type: "pulled",
            ref: build.ref,
            image: build.image,
            durationMs: Date.now() - pullStarted,
          });
        };
        // Without --push the images are wanted locally (e.g. to run them).
        if (!options.push) {
          await pull();
          return result("pulled");
        }
        let pulled: Promise<void> | undefined;
        pullers.set(build.ref, () => (pulled ??= pull()));
        return result("in-registry");
      }

      if (options.dryRun) return result("would-build");

      // Building needs its upstream images locally.
      for (const ref of upstreamsOf(build)) await pullers.get(ref)?.();

      const suffix = inputs.dirty ? "-dirty" : "";
      const builtAt = now().toISOString();
      const info: BuildInfo = {
        schema: 1,
        buildRef: build.ref,
        image: build.image,
        inputHash: inputs.inputHash,
        commits: {
          root: options.commits.root + suffix,
          saflib: options.commits.saflib + suffix,
        },
        dirty: inputs.dirty,
        platform,
        builtAt,
        upstream: upstreamsOf(build),
      };
      const logFile = path.join(options.logDir, `${build.image}.log`);
      let stats: BuildStats;
      let secrets: Record<string, string>;
      try {
        secrets = resolveBuildSecrets(build.secrets, contextDir);
      } catch (error) {
        return result("failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      try {
        stats = await limit(() => {
          emit({
            type: "start",
            ref: build.ref,
            image: build.image,
            action: "build",
          });
          return executor.build({
            contextDir,
            dockerfile: path.relative(contextDir, build.dockerfilePath),
            tags: tags.map((t) => `${build.image}:${t}`),
            platform: flag,
            buildArgs: { [BUILD_INFO_ARG]: JSON.stringify(info) },
            secrets,
            labels: {
              "org.opencontainers.image.revision": info.commits.root,
              "org.opencontainers.image.created": builtAt,
              "dev.saflib.build-ref": build.ref,
              "dev.saflib.input-hash": inputs.inputHash,
              "dev.saflib.saflib-revision": info.commits.saflib,
            },
            logFile,
            onProgress: (progress) =>
              emit({
                type: "progress",
                ref: build.ref,
                image: build.image,
                progress,
              }),
          });
        });
      } catch (error) {
        const output = existsSync(logFile) ? readFileSync(logFile, "utf8") : "";
        return result("failed", {
          error: error instanceof Error ? error.message : String(error),
          logFile,
          detailsUrl: findBuildDetailsUrl(output),
        });
      }
      await tagLocally();
      await publish();
      return result("built", {
        logFile,
        detailsUrl: stats.detailsUrl,
        steps: {
          total: stats.totalSteps,
          cached: stats.cachedSteps,
          executed: stats.executedSteps,
        },
      });
    } catch (error) {
      return result("failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // `plan` is in dependency order, so upstream promises exist first.
  for (const build of plan) {
    const promise = run(build).then((r) => {
      options.onResult?.(r);
      emit({ type: "finish", result: r });
      return r;
    });
    promises.set(build.ref, promise);
  }
  return Promise.all(plan.map((b) => promises.get(b.ref)!));
}
