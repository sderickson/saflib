import type {
  LockPruneIssue,
  PackageLock,
  WorkspaceDuplicateIssue,
  WorkspaceMisalignedIssue,
} from "./types.ts";
import {
  describeMisalignment,
  findWorkspaceNesting,
} from "./workspace-alignment.ts";

/**
 * The workspace alignment check (what the dev stack and CI run) as lock-prune
 * issues. Nested copies another issue already moves (unhoisted registry
 * dependencies, hoisting hazards) are left to that issue.
 */
export function findWorkspaceAlignmentIssues(
  lockfile: PackageLock,
  otherIssues: LockPruneIssue[],
): Array<WorkspaceDuplicateIssue | WorkspaceMisalignedIssue> {
  const handled = new Set<string>();
  for (const issue of otherIssues) {
    if (issue.kind === "unhoisted-registry-dependency") {
      handled.add(issue.nestedLockfileKey);
    } else if (issue.kind === "hoisting-hazard") {
      handled.add(issue.saflibLockfileKey);
    }
  }

  // Same lockfile shape; the alignment module types only the fields it reads.
  const packages = Object.fromEntries(
    Object.entries(lockfile.packages ?? {}).filter(([, entry]) => entry),
  ) as Parameters<typeof findWorkspaceNesting>[0];

  return findWorkspaceNesting(packages)
    .filter((nesting) => !handled.has(nesting.key))
    .map((nesting) =>
      nesting.kind === "duplicate"
        ? {
            kind: "workspace-duplicate" as const,
            dependency: nesting.name,
            version: nesting.nestedVersion,
            lockfileKey: nesting.key,
          }
        : {
            kind: "workspace-misaligned" as const,
            dependency: nesting.name,
            lockfileKey: nesting.key,
            nestedVersion: nesting.nestedVersion,
            rootVersion: nesting.rootVersion,
            detail: describeMisalignment(nesting),
          },
    );
}
