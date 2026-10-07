import type { DockerExecutor, LocalImage } from "./executor.ts";

const INPUT_TAG = /^in-[0-9a-f]{16}$/;

export interface CleanupPlan {
  /** Refs (`repo:tag`, local and registry-qualified) to untag. */
  remove: string[];
  /** Input tags kept, per `image (architecture)`. */
  kept: Record<string, string[]>;
}

/**
 * Which old `in-<hash>` tags of `imageNames` to remove: per image and
 * architecture, keep the `keep` most recently created tags plus any in
 * `protect` (e.g. what this run just built or verified). Registry-qualified
 * copies (`<registry>/<image>:<tag>`) go with their local tag. `latest` and
 * other tags are never touched.
 */
export function planImageCleanup(
  images: LocalImage[],
  imageNames: Iterable<string>,
  keep: number,
  protect: ReadonlySet<string> = new Set(),
): CleanupPlan {
  const names = new Set(imageNames);
  const nameOf = (repository: string) =>
    names.has(repository)
      ? repository
      : [...names].find((n) => repository.endsWith(`/${n}`));

  // image + architecture → tag → { createdAt, refs }
  const groups = new Map<
    string,
    Map<string, { createdAt: number; refs: string[] }>
  >();
  for (const image of images) {
    if (!INPUT_TAG.test(image.tag)) continue;
    const name = nameOf(image.repository);
    if (!name) continue;
    const key = `${name} (${image.architecture})`;
    const tags = groups.get(key) ?? new Map();
    const entry = tags.get(image.tag) ?? {
      createdAt: image.createdAt,
      refs: [],
    };
    entry.refs.push(`${image.repository}:${image.tag}`);
    tags.set(image.tag, entry);
    groups.set(key, tags);
  }

  const plan: CleanupPlan = { remove: [], kept: {} };
  for (const [key, tags] of groups) {
    const newestFirst = [...tags.entries()].sort(
      ([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0),
    );
    plan.kept[key] = [];
    newestFirst.forEach(([tag, { refs }], index) => {
      if (index < keep || protect.has(tag)) plan.kept[key].push(tag);
      else plan.remove.push(...refs);
    });
  }
  return plan;
}

export interface CleanupResult {
  removed: string[];
  /** Refs docker refused to remove (e.g. used by a container). */
  skipped: string[];
}

/**
 * Untags old input-tagged versions of `imageNames` (see
 * {@link planImageCleanup}), then prunes dangling images. Never forces, so
 * images that containers use are left alone.
 */
export async function cleanupImages(
  executor: DockerExecutor,
  imageNames: Iterable<string>,
  keep: number,
  protect: ReadonlySet<string> = new Set(),
): Promise<CleanupResult> {
  const plan = planImageCleanup(
    await executor.listImages(),
    imageNames,
    keep,
    protect,
  );
  const result: CleanupResult = { removed: [], skipped: [] };
  for (const ref of plan.remove) {
    ((await executor.removeImage(ref)) ? result.removed : result.skipped).push(
      ref,
    );
  }
  await executor.pruneDanglingImages();
  return result;
}
