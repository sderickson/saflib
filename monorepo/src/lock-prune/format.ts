import type { LockPruneIssue } from "./types.ts";

export function formatIssue(issue: LockPruneIssue): string[] {
  switch (issue.kind) {
    case "hoisting-hazard":
      return [
        `${issue.peer} is only installed under saflib/node_modules but is a peer of root-hoisted ${issue.requiredBy}.`,
        `  move lockfile entry: ${issue.saflibLockfileKey} -> ${issue.rootLockfileKey}`,
      ];
    case "redundant-dependency":
      return [
        `product redundantly declares ${issue.dependency}@${issue.spec} (saflib already owns it).`,
        `  package: ${issue.packageName}`,
        `  file: ${issue.packageJsonPath}`,
        `  field: ${issue.field}`,
      ];
    case "competing-dependency":
      return [
        `product declares ${issue.dependency}@${issue.productSpec} but saflib owns ${issue.saflibSpecs.join(", ")}.`,
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
        `  align lock entry: ${issue.productAlignKey} <- ${issue.platformLockfileKey}@${issue.platformVersion}`,
        ...(issue.productLockfileKey !== issue.productAlignKey
          ? [`  remove nested lock entry: ${issue.productLockfileKey}`]
          : []),
      ];
    case "platform-override-sync":
      return [
        "product root overrides drift from saflib platform pins.",
        ...Object.entries(issue.missing).map(
          ([name, version]) => `  add override: ${name}@${version}`,
        ),
        ...Object.entries(issue.changed).map(
          ([name, change]) =>
            `  update override: ${name}@${change.from} -> ${change.to}`,
        ),
      ];
  }
}
