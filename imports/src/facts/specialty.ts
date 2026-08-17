/**
 * Path-agnostic parse facts for one source file (content-addressable IR).
 */
import {
  extractDrizzleTables,
  extractExports,
  extractImports,
  extractLocalExportUsages,
  extractTestCases,
  extractVueSfc,
  isVueSfc,
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
 * `localExportUsages` is optional for older blob_facts rows (pre analyzer v8).
 */
export type FileSpecialty =
  | {
      kind: "source";
      exports: FileExportFact[];
      imports: FileImportFact[];
      /** Export names referenced as values elsewhere in this file. */
      localExportUsages?: string[];
    }
  | {
      kind: "test";
      exports: FileExportFact[];
      imports: FileImportFact[];
      localExportUsages?: string[];
      testCases: FileTestCaseFact[];
    }
  | {
      kind: "sql-table";
      exports: FileExportFact[];
      imports: FileImportFact[];
      localExportUsages?: string[];
      tables: FileTableFact[];
    };

export function specialtyExports(specialty: FileSpecialty): FileExportFact[] {
  return specialty.exports;
}

export function specialtyImports(specialty: FileSpecialty): FileImportFact[] {
  return specialty.imports;
}

export function specialtyLocalExportUsages(
  specialty: FileSpecialty,
): string[] {
  return specialty.localExportUsages ?? [];
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
  const vue = isVueSfc(source) ? extractVueSfc(source) : null;
  const parseSource = vue ? vue.script : source;

  const exports = extractExports(parseSource).map((e) => ({
    name: e.name,
    kind: e.kind,
    signature: e.signature,
    docstring: e.docstring,
  }));
  if (vue) {
    exports.push({
      name: "default",
      kind: "component",
      signature: "(vue component)",
      docstring: null,
    });
    for (const p of vue.props) {
      exports.push({
        name: p.name,
        kind: p.kind,
        signature: p.signature,
        docstring: p.docstring,
      });
    }
    for (const e of vue.emits) {
      exports.push({
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
      });
    }
  }
  const imports = extractImports(parseSource).map((i) => ({
    specifier: i.specifier,
    names: i.names,
  }));
  const localExportUsages = extractLocalExportUsages(parseSource);
  const tables = extractDrizzleTables(parseSource).map((t) => ({
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
    return { kind: "sql-table", exports, imports, localExportUsages, tables };
  }
  const testCases = extractTestCases(parseSource).map((t) => ({
    fullName: t.fullName,
  }));
  if (testCases.length > 0) {
    return { kind: "test", exports, imports, localExportUsages, testCases };
  }
  return { kind: "source", exports, imports, localExportUsages };
}
