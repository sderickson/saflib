import type { InsertAnalyzedCommitParams } from "../types.ts";

let counter = 0;

/** Build an InsertAnalyzedCommitParams with unique hash and controllable authoredAt. */
export function makeCommit(
  overrides: Partial<InsertAnalyzedCommitParams> = {},
): InsertAnalyzedCommitParams {
  counter += 1;
  const n = String(counter).padStart(2, "0");
  const base = Date.UTC(2026, 0, 1, 12, 0, 0) + counter * 60_000;
  return {
    hash: overrides.hash ?? `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa${n}`,
    parentHashes: overrides.parentHashes ?? [],
    authoredAt: overrides.authoredAt ?? new Date(base),
    message: overrides.message ?? `commit ${n}`,
    refs: overrides.refs ?? [
      { name: "main", type: "branch", isMainAncestor: true },
    ],
    analyzerVersion: overrides.analyzerVersion ?? "1",
    computedAt: overrides.computedAt ?? new Date(base + 1000),
    status: overrides.status ?? "complete",
  };
}
