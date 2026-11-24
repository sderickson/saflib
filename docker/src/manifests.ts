import type { Build } from "./builds.ts";
import type { DockerExecutor } from "./executor.ts";
import {
  computeBuildInputs,
  inputTag,
  type BuildInputs,
  type WorkingTreeHashCache,
} from "./inputs.ts";
import { PLATFORM_ALIASES, withUpstreams } from "./build-images.ts";

export interface PublishManifestsOptions {
  contextDir: string;
  /** Every build in the monorepo (for resolving upstreams). */
  builds: Build[];
  /** Builds whose moving tags to publish; their upstream builds are added. */
  selected: Build[];
  /** Platforms to combine, e.g. `["amd64", "arm64"]` or `linux/arm64`. */
  platforms: string[];
  /** Registry prefix, e.g. `registry.example.com/team`. */
  registry: string;
  executor: DockerExecutor;
  /** Report what would be published without publishing. */
  dryRun?: boolean;
  onPublished?: (published: PublishedManifest) => void;
}

export interface PublishedManifest {
  ref: string;
  image: string;
  /** The moving tags now pointing at the manifest list (`latest`, …). */
  tags: string[];
  /** Each platform's input-tagged image, e.g. `linux/arm64` → `in-…`. */
  sources: Record<string, string>;
}

/**
 * Resolves platform names (`amd64`, `arm64`, `linux/arm64`) to `os/arch`.
 * `native` isn't allowed: a multi-arch manifest names its platforms.
 */
export function resolvePlatforms(platforms: string[]): string[] {
  const out = platforms.map((raw) => {
    const platform = PLATFORM_ALIASES[raw] ?? raw;
    if (!/^[a-z0-9]+\/[a-z0-9]+(\/[a-z0-9]+)?$/.test(platform)) {
      throw new Error(
        `Unrecognized platform "${raw}" (multi-arch builds need explicit platforms, e.g. amd64,arm64)`,
      );
    }
    return platform;
  });
  return [...new Set(out)];
}

/**
 * Points each image's moving tags (`latest` and `build.json` tags) at a
 * manifest list of its per-platform input-tagged images. Input hashes are
 * computed from the checkout (no build), so this can run in a separate CI job
 * after each architecture's job pushed its images. Throws, naming every
 * missing image, before publishing anything if any platform's image isn't in
 * the registry.
 */
export async function publishManifests(
  options: PublishManifestsOptions,
): Promise<PublishedManifest[]> {
  const platforms = resolvePlatforms(options.platforms);
  if (platforms.length === 0) throw new Error("No platforms given");
  const registry = options.registry.replace(/\/+$/, "");
  const remote = (image: string, tag: string) => `${registry}/${image}:${tag}`;
  const byRef = new Map(options.builds.map((b) => [b.ref, b]));
  const hashCache: WorkingTreeHashCache = new Map();
  const memos = new Map<string, Map<string, BuildInputs>>();
  const inputsOf = (build: Build, platform: string) => {
    let memo = memos.get(platform);
    if (!memo) memos.set(platform, (memo = new Map()));
    return computeBuildInputs(
      build,
      {
        contextDir: options.contextDir,
        builds: options.builds,
        platform,
        skipAudit: true,
        hashCache,
      },
      memo,
    );
  };
  const plan = withUpstreams(options.selected, byRef, (b) =>
    inputsOf(b, platforms[0]),
  );

  const manifests = plan.map((build) => ({
    build,
    sources: Object.fromEntries(
      platforms.map((p) => [
        p,
        remote(build.image, inputTag(inputsOf(build, p).inputHash)),
      ]),
    ) as Record<string, string>,
  }));

  const missing: string[] = [];
  await Promise.all(
    manifests.flatMap(({ sources }) =>
      Object.entries(sources).map(async ([platform, ref]) => {
        if (!(await options.executor.remoteImageExists(ref))) {
          missing.push(`${ref} (${platform})`);
        }
      }),
    ),
  );
  if (missing.length > 0) {
    throw new Error(
      `Not in the registry yet (push each platform first):\n  ${missing.sort().join("\n  ")}`,
    );
  }

  const published: PublishedManifest[] = [];
  for (const { build, sources } of manifests) {
    const tags = ["latest", ...build.extraTags];
    if (!options.dryRun) {
      for (const tag of tags) {
        await options.executor.remoteManifest(
          remote(build.image, tag),
          Object.values(sources),
        );
      }
    }
    const entry = { ref: build.ref, image: build.image, tags, sources };
    published.push(entry);
    options.onPublished?.(entry);
  }
  return published;
}
