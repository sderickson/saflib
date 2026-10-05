export type LockEntry = Record<string, unknown>;

export interface Lockfile {
  packages?: Record<string, LockEntry>;
  [key: string]: unknown;
}

const PROD_DEPENDENCY_FIELDS = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

/**
 * Lock entry keys reachable from `roots` (lock keys, e.g. `""` for the root
 * or `saflib/express` for a workspace) through production dependencies,
 * resolved the way node does: the nearest `node_modules/<name>` walking up
 * from the dependent, following workspace links. Optional dependencies are
 * followed for every platform, so native binaries for all targets stay in.
 */
export function lockClosure(
  packages: Record<string, LockEntry>,
  roots: Iterable<string>,
): string[] {
  const seen = new Set<string>();
  const queue = [...roots].filter((root) => packages[root]);
  // Node checks `<dir>/node_modules/<name>` for every ancestor dir, not just
  // at node_modules boundaries — e.g. a workspace at `saflib/commander` can
  // resolve `saflib/node_modules/commander`.
  const resolve = (from: string, name: string): string | undefined => {
    const segments = from === "" ? [] : from.split("/");
    for (let i = segments.length; i >= 0; i--) {
      if (i > 0 && segments[i - 1] === "node_modules") continue;
      const candidate = [...segments.slice(0, i), "node_modules", name].join(
        "/",
      );
      if (packages[candidate]) return candidate;
    }
    return undefined;
  };
  while (queue.length > 0) {
    const key = queue.pop()!;
    if (seen.has(key)) continue;
    seen.add(key);
    const entry = packages[key];
    if (entry.link && typeof entry.resolved === "string") {
      if (packages[entry.resolved]) queue.push(entry.resolved);
      continue;
    }
    for (const field of PROD_DEPENDENCY_FIELDS) {
      const deps = (entry[field] as Record<string, string> | undefined) ?? {};
      for (const name of Object.keys(deps)) {
        const dep = resolve(key, name);
        if (dep) queue.push(dep);
      }
    }
  }
  return [...seen];
}

function dropDependencies(
  manifest: Record<string, unknown>,
  names: ReadonlySet<string>,
): void {
  for (const field of PROD_DEPENDENCY_FIELDS) {
    const deps = manifest[field] as Record<string, string> | undefined;
    if (!deps) continue;
    const kept = Object.fromEntries(
      Object.entries(deps).filter(([name]) => !names.has(name)),
    );
    if (Object.keys(kept).length > 0) manifest[field] = kept;
    else delete manifest[field];
  }
}

export interface PruneLockfileOptions {
  /** Lock keys (root-relative posix dirs) of the workspaces the image includes. */
  workspaceDirs: readonly string[];
  /**
   * Workspace packages the root depends on that the image doesn't include;
   * dropped from the root entry (the staged root manifest drops them too).
   */
  excludedWorkspaceNames: ReadonlySet<string>;
}

/**
 * The lockfile one image installs from: only entries reachable from the root
 * and the image's own workspaces, with `devDependencies` keys removed (images
 * run `npm ci --omit=dev`). The root entry's `workspaces` is narrowed to the
 * image's workspace dirs, matching the staged root `package.json`.
 *
 * This keeps an image's staged install inputs — and so its input hash — from
 * changing when only *other* images' dependencies change.
 */
export function pruneLockfile(
  lockfile: Lockfile,
  options: PruneLockfileOptions,
): Lockfile {
  const packages: Record<string, LockEntry> = {};
  for (const [key, entry] of Object.entries(lockfile.packages ?? {})) {
    const { devDependencies: _devDependencies, ...rest } = entry;
    packages[key] = rest;
  }
  const root = packages[""];
  if (root) {
    root.workspaces = [...options.workspaceDirs];
    dropDependencies(root, options.excludedWorkspaceNames);
  }
  // npm wants each workspace's `node_modules/<name>` link entry even when
  // nothing depends on that workspace (e.g. the image's own top package).
  const workspaceDirs = new Set(options.workspaceDirs);
  const workspaceLinks = Object.keys(packages).filter((key) => {
    const entry = packages[key];
    return (
      entry.link === true &&
      typeof entry.resolved === "string" &&
      workspaceDirs.has(entry.resolved)
    );
  });
  const keep = new Set(
    lockClosure(packages, ["", ...options.workspaceDirs, ...workspaceLinks]),
  );
  // npm places `a/node_modules/x` under the `a` node, so every ancestor that
  // has its own entry (e.g. a product's `saflib` dir, which is a workspace
  // nothing depends on) must stay even when unreachable.
  for (const key of [...keep]) {
    const segments = key.split("/");
    for (let i = 1; i < segments.length; i++) {
      const ancestor = segments.slice(0, i).join("/");
      if (packages[ancestor]) keep.add(ancestor);
    }
  }
  return {
    ...lockfile,
    packages: Object.fromEntries(
      Object.entries(packages).filter(([key]) => keep.has(key)),
    ),
  };
}

export interface StageRootPackageJsonOptions {
  /** Staged root package name (see `stageRootPackageName`). */
  name: string;
  workspaceDirs: readonly string[];
  excludedWorkspaceNames: ReadonlySet<string>;
}

/**
 * Narrows an already install-stripped root manifest to one image: its
 * `workspaces` become exactly the image's workspace dirs (so adding or
 * renaming unrelated products doesn't change it), and root dependencies on
 * workspaces the image doesn't include are dropped.
 */
export function narrowRootPackageJson(
  stripped: Record<string, unknown>,
  options: StageRootPackageJsonOptions,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...stripped,
    name: options.name,
    private: true,
  };
  if (out.workspaces !== undefined) out.workspaces = [...options.workspaceDirs];
  dropDependencies(out, options.excludedWorkspaceNames);
  return out;
}
