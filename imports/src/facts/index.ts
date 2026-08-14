export {
  ANALYZER_VERSION,
  MemoryFactStore,
  fileFactFromSource,
  type FactStore,
  type FileFact,
} from "./fact-store.ts";
export {
  buildFileSpecialty,
  countSourceLines,
  specialtyExports,
  specialtyImports,
  specialtyLocalExportUsages,
  specialtyTables,
  specialtyTestCases,
  type FileExportFact,
  type FileImportFact,
  type FileSpecialty,
  type FileTableColumnFact,
  type FileTableFact,
  type FileTestCaseFact,
} from "./specialty.ts";
