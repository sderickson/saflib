/** Kind of a top-level export declaration. */
export type ExportKind =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "const"
  | "enum"
  | "variable"
  | "component"
  | "prop"
  | "emit";

/** One exported symbol found by {@link extractExports}. */
export interface ExportEntry {
  name: string;
  kind: ExportKind;
  /**
   * Syntactic display signature (no type-checker).
   * Examples: `(a: number, b: string) => Promise<void>`, `{ name: string }`, `= 1`.
   * `null` when the local declaration has no useful surface (e.g. `export { a }` re-export).
   */
  signature: string | null;
  /**
   * First prose line of the leading JSDoc block, or `null` when absent
   * (including bare re-exports like `export { a }`).
   */
  docstring: string | null;
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

/** One static import / re-export-from found by {@link extractImports}. */
export interface ImportEntry {
  /** Module specifier string as written (`@scope/pkg/…` or relative). */
  specifier: string;
  /**
   * Exported names pulled from the module. Empty for side-effect-only imports.
   * `"default"` for default import; `"*"` for namespace / `export *`.
   */
  names: string[];
}

/** One column inside a drizzle table definition. */
export interface DrizzleTableColumn {
  propName: string;
  sqlName: string;
  /** Builder callee: `text`, `integer`, … */
  typeKind: string;
  /**
   * First prose line of leading JSDoc on the column property (or a matching
   * `*Entity` interface property in the same file), or `null` when absent.
   */
  docstring: string | null;
}

/** One drizzle `sqliteTable` / `pgTable` / `mysqlTable` found by {@link extractDrizzleTables}. */
export interface DrizzleTableEntry {
  /** Binding name of the const (`packageMetricsTable`). */
  exportName: string;
  /** SQL table name (first arg to `sqliteTable`). */
  tableName: string;
  /**
   * First prose line of leading JSDoc on the table `const` declaration,
   * or `null` when absent.
   */
  docstring: string | null;
  columns: DrizzleTableColumn[];
}
