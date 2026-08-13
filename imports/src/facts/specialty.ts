/**
 * Path-agnostic parse facts for one source file (content-addressable IR).
 */
import {
  extractDrizzleTables,
  extractExports,
  extractImports,
  extractTestCases,
  type ExportKind,
} from "@saflib/parser";

export type { ExportKind };

export interface FileExportFact {
  name: string;
  kind: ExportKind;
  /** Syntactic signature; null for re-exports without a local declaration. */
  signature: string | null;
  /** First prose line of leading JSDoc; null when absent or for bare re-exports. */
  docstring: string | null;
}

export interface FileImportFact {
  specifier: string;
  names: string[];
}

export interface FileTestCaseFact {
  fullName: string;
}

export interface FileTableColumnFact {
  propName: string;
  sqlName: string;
  typeKind: string;
  docstring: string | null;
}

export interface FileTableFact {
  exportName: string;
  tableName: string;
  docstring: string | null;
  columns: FileTableColumnFact[];
}

/**
 * Discriminated specialty for one file. `exports` and `imports` are on every
 * kind; kind-only props are `testCases` (test) and `tables` (sql-table).
 */
export type FileSpecialty =
  | {
      kind: "source";
      exports: FileExportFact[];
      imports: FileImportFact[];
    }
  | {
      kind: "test";
      exports: FileExportFact[];
      imports: FileImportFact[];
      testCases: FileTestCaseFact[];
    }
  | {
      kind: "sql-table";
      exports: FileExportFact[];
      imports: FileImportFact[];
      tables: FileTableFact[];
    };

export function specialtyExports(specialty: FileSpecialty): FileExportFact[] {
  return specialty.exports;
}

export function specialtyImports(specialty: FileSpecialty): FileImportFact[] {
  return specialty.imports;
}

export function specialtyTestCases(
  specialty: FileSpecialty,
): FileTestCaseFact[] {
  return specialty.kind === "test" ? specialty.testCases : [];
}

export function specialtyTables(specialty: FileSpecialty): FileTableFact[] {
  return specialty.kind === "sql-table" ? specialty.tables : [];
}

export function countSourceLines(text: string): number {
  if (text.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  if (text.charCodeAt(text.length - 1) !== 10) n++;
  return n;
}

/** Build FileSpecialty from source text via @saflib/parser extractors. */
export function buildFileSpecialty(source: string): FileSpecialty {
  const exports = extractExports(source).map((e) => ({
    name: e.name,
    kind: e.kind,
    signature: e.signature,
    docstring: e.docstring,
  }));
  const imports = extractImports(source).map((i) => ({
    specifier: i.specifier,
    names: i.names,
  }));
  const tables = extractDrizzleTables(source).map((t) => ({
    exportName: t.exportName,
    tableName: t.tableName,
    docstring: t.docstring,
    columns: t.columns.map((c) => ({
      propName: c.propName,
      sqlName: c.sqlName,
      typeKind: c.typeKind,
      docstring: c.docstring,
    })),
  }));
  if (tables.length > 0) {
    return { kind: "sql-table", exports, imports, tables };
  }
  const testCases = extractTestCases(source).map((t) => ({
    fullName: t.fullName,
  }));
  if (testCases.length > 0) {
    return { kind: "test", exports, imports, testCases };
  }
  return { kind: "source", exports, imports };
}
