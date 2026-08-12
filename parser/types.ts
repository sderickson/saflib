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
 * public contract — `@saflib/dev-site-db`'s `test_cases.fullName` column stores it
 * as-is for diffing across commits.
 */
export interface TestCaseEntry {
  fullName: string;
}
