/** Kind of a top-level export declaration. */
export type ExportKind =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "const"
  | "enum"
  | "variable";

/** One exported symbol found by {@link extractExports}. */
export interface ExportEntry {
  name: string;
  kind: ExportKind;
}

/**
 * One test case found by {@link extractTestCases}.
 *
 * `fullName` joins enclosing `describe` titles and the leaf `it`/`test` title with
 * `" > "` (e.g. `"outer > inner > does the thing"`). That separator is part of the
 * public contract — blob_facts stores it as-is for assembly across commits.
 */
export interface TestCaseEntry {
  fullName: string;
}
