import type { LockPruneIssue } from "./types.ts";

/** Overrides can nest (`{ "editorconfig": { "commander": "^15" } }`). */
function formatOverride(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function formatIssue(issue: LockPruneIssue): string[] {
  switch (issue.kind) {
    case "hoisting-hazard":
      return [
        `${issue.peer} is only installed under saflib/node_modules but is a peer of root-hoisted ${issue.requiredBy}.`,
        `  move lockfile entry: ${issue.saflibLockfileKey} -> ${issue.rootLockfileKey}`,
      ];
    case "competing-dependency":
      return [
        `product declares ${issue.dependency}@${issue.productSpec}, which can't include the ${issue.saflibSpecs.join(", ")} saflib installs (npm would need a second copy).`,
        `  package: ${issue.packageName}`,
        `  file: ${issue.packageJsonPath}`,
        `  field: ${issue.field}`,
      ];
    case "stale-lockfile":
      return [
        `package-lock.json has ${issue.stalePaths.length} stale workspace entr${issue.stalePaths.length === 1 ? "y" : "ies"} (${issue.removedCount} total keys to remove).`,
        ...issue.stalePaths.slice(0, 5).map((entry) => `  - ${entry}`),
        ...(issue.stalePaths.length > 5
          ? [`  - ... ${issue.stalePaths.length - 5} more`]
          : []),
      ];
    case "unhoisted-registry-dependency":
      return [
        `${issue.dependency}${issue.version ? `@${issue.version}` : ""} is locked under a saflib workspace path but missing from the product root.`,
        `  move lockfile entry: ${issue.nestedLockfileKey} -> ${issue.rootLockfileKey}`,
      ];
    case "lockfile-version-skew":
      return [
        `${issue.dependency} is ${issue.productVersion} in the product lockfile but ${issue.platformVersion} in saflib/package-lock.json.`,
        `  product lock entry: ${issue.productLockfileKey}`,
        `  saflib lock entry: ${issue.platformLockfileKey}`,
      ];
    case "workspace-duplicate":
      return [
        `${issue.dependency}${issue.version ? `@${issue.version}` : ""} is locked twice: at the root and again under a workspace (two copies break packages that must load once, like Vue).`,
        `  remove lockfile entry: ${issue.lockfileKey}`,
      ];
    case "workspace-misaligned":
      return [
        `${issue.dependency} is ${issue.nestedVersion ?? "?"} under a workspace but ${issue.rootVersion ?? "(none)"} at the root, so workspaces load different copies.`,
        ...issue.detail.map((line) => `  ${line}`),
      ];
    case "platform-override-sync":
      return [
        "product root overrides differ from saflib's (yours to keep or change).",
        ...Object.entries(issue.missing).map(
          ([name, version]) =>
            `  add override: ${name}@${formatOverride(version)}`,
        ),
        ...Object.entries(issue.changed).map(
          ([name, change]) =>
            `  update override: ${name}@${formatOverride(change.from)} -> ${formatOverride(change.to)}`,
        ),
      ];
  }
}
