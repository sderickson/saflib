import path from "node:path";
import type { Build } from "./builds.ts";
import type { DockerExecutor } from "./executor.ts";
import { computeBuildInputs, inputTag, type BuildInputs } from "./inputs.ts";
import { BUILD_INFO_ARG, type BuildInfo } from "./metadata.ts";

export type BuildOutcome =
  /** The input-tagged image was already local; `latest` retagged. */
  | "up-to-date"
  /** Found in the registry and pulled (or retagged there). */
  | "pulled"
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
  logFile?: string;
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
  const serverPlatform = await executor.serverPlatform();
  const { platform, flag } = resolvePlatform(options.platform, serverPlatform);

  const byRef = new Map(options.builds.map((b) => [b.ref, b]));
  const memo = new Map<string, BuildInputs>();
  const inputsOf = (build: Build) =>
    computeBuildInputs(
      build,
      { contextDir, builds: options.builds, platform, skipAudit: true },
      memo,
    );
  const plan = withUpstreams(options.selected, byRef, inputsOf);
  const upstreamsOf = (build: Build) =>
    inputsOf(build)
      .inputs.filter((i) => i.kind === "upstream")
      .map((i) => i.key);
  const hasDownstream = (ref: string) =>
    plan.some((b) => upstreamsOf(b).includes(ref));

  const registry = options.registry?.replace(/\/+$/, "");
  const remote = (image: string, tag: string) => `${registry}/${image}:${tag}`;
  const limit = semaphore(Math.max(1, options.concurrency ?? 4));
  const now = options.now ?? (() => new Date());
  const promises = new Map<string, Promise<BuildResult>>();

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

    const tagLocally = async () => {
      for (const t of tags.slice(1))
        await executor.tag(local, `${build.image}:${t}`);
    };
    const publish = async () => {
      if (!options.push) return;
      for (const t of tags) {
        await executor.tag(local, remote(build.image, t));
        await executor.push(remote(build.image, t));
      }
    };

    try {
      if (!options.force && (await executor.localImageExists(local))) {
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

      if (
        !options.force &&
        registry &&
        (await executor.remoteImageExists(remote(build.image, tag)))
      ) {
        if (options.dryRun) return result("would-pull");
        if (options.push) {
          for (const t of tags.slice(1)) {
            await executor.remoteTag(
              remote(build.image, tag),
              remote(build.image, t),
            );
          }
        }
        // Downstream builds (and local runs) need it in the local daemon.
        if (!options.push || hasDownstream(build.ref)) {
          await limit(() => executor.pull(remote(build.image, tag), flag));
          await executor.tag(remote(build.image, tag), local);
          await tagLocally();
        }
        return result("pulled");
      }

      if (options.dryRun) return result("would-build");

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
      try {
        await limit(() =>
          executor.build({
            contextDir,
            dockerfile: path.relative(contextDir, build.dockerfilePath),
            tags: tags.map((t) => `${build.image}:${t}`),
            platform: flag,
            buildArgs: { [BUILD_INFO_ARG]: JSON.stringify(info) },
            labels: {
              "org.opencontainers.image.revision": info.commits.root,
              "org.opencontainers.image.created": builtAt,
              "dev.saflib.build-ref": build.ref,
              "dev.saflib.input-hash": inputs.inputHash,
              "dev.saflib.saflib-revision": info.commits.saflib,
            },
            logFile,
          }),
        );
      } catch (error) {
        return result("failed", {
          error: error instanceof Error ? error.message : String(error),
          logFile,
        });
      }
      await publish();
      return result("built", { logFile });
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
      return r;
    });
    promises.set(build.ref, promise);
  }
  return Promise.all(plan.map((b) => promises.get(b.ref)!));
}
