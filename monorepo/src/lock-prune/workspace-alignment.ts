/**
 * Checks that a monorepo's lockfile installs every package once, at the root,
 * so product and saflib workspace packages all resolve each dependency to the
 * same copy. `saf-monorepo lock-prune` reports (and with `--fix`, repairs)
 * these; the dev stack's `deps` service and `check-dependency-alignment.ts`
 * (product/init, CI) run the check directly.
 *
 * Uses only Node built-ins: the dev stack runs it before node_modules exists.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

type LockPackages = Record<
  string,
  {
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  }
>;

export function readLockPackages(root: string): LockPackages {
  return (
    (
      JSON.parse(
        readFileSync(path.join(root, "package-lock.json"), "utf8"),
      ) as {
        packages?: LockPackages;
      }
    ).packages ?? {}
  );
}

export const isWorkspaceKey = (key: string) =>
  key !== "" &&
  !key.startsWith("node_modules/") &&
  !key.includes("/node_modules/");

function requestedRange(
  entry: LockPackages[string],
  name: string,
): string | undefined {
  return (
    entry.dependencies?.[name] ??
    entry.devDependencies?.[name] ??
    entry.peerDependencies?.[name] ??
    entry.optionalDependencies?.[name]
  );
}

/** The lockfile entry Node would load for `name` from `requester`'s directory. */
function resolvesTo(
  packages: LockPackages,
  requester: string,
  name: string,
): string | undefined {
  let dir = requester;
  for (;;) {
    const candidate = dir
      ? `${dir}/node_modules/${name}`
      : `node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!dir) return undefined;
    dir = parentDir(dir);
  }
}

/** One directory up from a lockfile key, the way Node walks for node_modules. */
function parentDir(dir: string): string {
  const nm = dir.lastIndexOf("/node_modules/");
  if (nm !== -1) return dir.slice(0, nm); // out of a nested package
  if (dir.startsWith("node_modules/")) return ""; // out of a root package
  const slash = dir.lastIndexOf("/");
  return slash === -1 ? "" : dir.slice(0, slash); // up a workspace path
}

export interface DependencyAlignment {
  /** Workspace packages want a version the root can't share. */
  misaligned: string[];
  /**
   * A second copy of the root's own version below a workspace directory. npm
   * doesn't produce these itself (they come from editing the lockfile), but
   * two copies still break packages that must be loaded once (e.g. Vue).
   */
  duplicated: string[];
}

/** One package installed below a workspace directory instead of at the root. */
export interface WorkspaceNesting {
  /** `duplicate`: same version as the root's copy; `misaligned`: a different one. */
  kind: "duplicate" | "misaligned";
  name: string;
  /** Lockfile key of the nested copy, e.g. `saflib/vue/node_modules/vite`. */
  key: string;
  /** The workspace directory it's nested under. */
  dir: string;
  nestedVersion?: string;
  rootVersion?: string;
  /** Who asks for it under `dir`, as "requester wants range". */
  nestedRequesters: string[];
  /** Who resolves to the root copy, as "requester wants range". */
  rootRequesters: string[];
}

/**
 * Packages the lockfile installs below a workspace directory instead of at the
 * root. Every workspace package (product or saflib) should resolve each
 * dependency to the same copy.
 */
export function findWorkspaceNesting(
  packages: LockPackages,
): WorkspaceNesting[] {
  const result: WorkspaceNesting[] = [];
  for (const key of Object.keys(packages)) {
    if (key.startsWith("node_modules/") || !key.includes("/node_modules/")) {
      continue;
    }
    const [dir, rest] = key.split(/\/node_modules\/(.*)/s) as [string, string];
    // Only the top of each nested tree; deeper entries belong to it.
    if (rest.includes("/node_modules/")) continue;
    const name = rest;
    const nestedVersion = packages[key]!.version;
    const rootVersion = packages[`node_modules/${name}`]?.version;
    if (nestedVersion !== undefined && nestedVersion === rootVersion) {
      result.push({
        kind: "duplicate",
        name,
        key,
        dir,
        nestedVersion,
        rootVersion,
        nestedRequesters: [],
        rootRequesters: [],
      });
      continue;
    }
    const nestedRequesters: string[] = [];
    const rootRequesters: string[] = [];
    for (const [requester, entry] of Object.entries(packages)) {
      const range = requestedRange(entry, name);
      if (!range) continue;
      const underDir =
        isWorkspaceKey(requester) &&
        (requester === dir || requester.startsWith(`${dir}/`));
      if (underDir) {
        nestedRequesters.push(`${requester || "(root)"} wants ${range}`);
      } else if (
        resolvesTo(packages, requester, name) === `node_modules/${name}`
      ) {
        rootRequesters.push(
          `${requester.replace(/^node_modules\//, "") || "(root)"} wants ${range}`,
        );
      }
    }
    result.push({
      kind: "misaligned",
      name,
      key,
      dir,
      nestedVersion,
      rootVersion,
      nestedRequesters,
      rootRequesters,
    });
  }
  return result;
}

/** Detail lines for a misaligned nesting (who wants which version). */
export function describeMisalignment(nesting: WorkspaceNesting): string[] {
  return [
    `${nesting.name}: ${nesting.nestedVersion} installed under ${nesting.dir}/node_modules, ${nesting.rootVersion ?? "(none)"} at the root`,
    `  ${nesting.nestedVersion}: ${nesting.nestedRequesters.join("; ") || "(no direct requester)"}`,
    `  root: ${nesting.rootRequesters.join("; ") || "(no direct requester)"}`,
  ];
}

export function findDependencyMisalignment(
  packages: LockPackages,
): DependencyAlignment {
  const result: DependencyAlignment = { misaligned: [], duplicated: [] };
  for (const nesting of findWorkspaceNesting(packages)) {
    if (nesting.kind === "duplicate") {
      result.duplicated.push(
        `  ${nesting.name}@${nesting.nestedVersion}: ${nesting.key}`,
      );
    } else {
      result.misaligned.push(
        describeMisalignment(nesting)
          .map((line) => `  ${line}`)
          .join("\n"),
      );
    }
  }
  return result;
}

/** The failure message for `alignment`, or undefined if it's clean. */
export function formatDependencyMisalignment(
  alignment: DependencyAlignment,
  prefix: string,
): string | undefined {
  const sections: string[] = [];
  if (alignment.misaligned.length > 0) {
    sections.push(
      `${prefix} Dependency versions are out of alignment: these workspace packages can't share the root's version.\n${alignment.misaligned.join("\n")}\n` +
        `${prefix} Align the version ranges, or add an "overrides" entry in the root package.json, then npm install.`,
    );
  }
  if (alignment.duplicated.length > 0) {
    sections.push(
      `${prefix} package-lock.json installs a second copy of these packages, at the same version as the root's:\n${alignment.duplicated.join("\n")}\n` +
        `${prefix} Delete those entries (and their own nested entries) from package-lock.json, then npm install.`,
    );
  }
  return sections.length > 0 ? sections.join("\n") : undefined;
}
