import type { InsertAnalyzedCommitParams } from "../types.ts";

let counter = 0;

/** Build an InsertAnalyzedCommitParams with unique hash and controllable authored_at. */
export function makeCommit(
  overrides: Partial<InsertAnalyzedCommitParams> = {},
): InsertAnalyzedCommitParams {
  counter += 1;
  const n = String(counter).padStart(2, "0");
  const base = Date.UTC(2026, 0, 1, 12, 0, 0) + counter * 60_000;
  return {
    hash: overrides.hash ?? `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa${n}`,
    parent_hashes: overrides.parent_hashes ?? [],
    authored_at: overrides.authored_at ?? new Date(base),
    message: overrides.message ?? `commit ${n}`,
    refs: overrides.refs ?? [
      { name: "main", type: "branch", is_main_ancestor: true },
    ],
    analyzer_version: overrides.analyzer_version ?? "1",
    computed_at: overrides.computed_at ?? new Date(base + 1000),
    status: overrides.status ?? "complete",
    export_count: overrides.export_count ?? 0,
    test_case_count: overrides.test_case_count ?? 0,
  };
}
