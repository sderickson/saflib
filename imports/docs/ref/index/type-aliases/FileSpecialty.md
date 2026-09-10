[**@saflib/imports**](../../index.md)

---

# Type Alias: FileSpecialty

> **FileSpecialty** = \{ `exports`: [`FileExportFact`](../interfaces/FileExportFact.md)[]; `imports`: [`FileImportFact`](../interfaces/FileImportFact.md)[]; `kind`: `"source"`; `localExportUsages?`: `string`[]; \} \| \{ `exports`: [`FileExportFact`](../interfaces/FileExportFact.md)[]; `imports`: [`FileImportFact`](../interfaces/FileImportFact.md)[]; `kind`: `"test"`; `localExportUsages?`: `string`[]; `testCases`: [`FileTestCaseFact`](../interfaces/FileTestCaseFact.md)[]; \} \| \{ `exports`: [`FileExportFact`](../interfaces/FileExportFact.md)[]; `imports`: [`FileImportFact`](../interfaces/FileImportFact.md)[]; `kind`: `"sql-table"`; `localExportUsages?`: `string`[]; `tables`: [`FileTableFact`](../interfaces/FileTableFact.md)[]; \}

Discriminated specialty for one file. `exports` and `imports` are on every
kind; kind-only props are `testCases` (test) and `tables` (sql-table).
`localExportUsages` is optional for older blob_facts rows (pre analyzer v8).

## Type declaration

\{ `exports`: [`FileExportFact`](../interfaces/FileExportFact.md)[]; `imports`: [`FileImportFact`](../interfaces/FileImportFact.md)[]; `kind`: `"source"`; `localExportUsages?`: `string`[]; \}

### exports

> **exports**: [`FileExportFact`](../interfaces/FileExportFact.md)[]

### imports

> **imports**: [`FileImportFact`](../interfaces/FileImportFact.md)[]

### kind

> **kind**: `"source"`

### localExportUsages?

> `optional` **localExportUsages**: `string`[]

Export names referenced as values elsewhere in this file.

\{ `exports`: [`FileExportFact`](../interfaces/FileExportFact.md)[]; `imports`: [`FileImportFact`](../interfaces/FileImportFact.md)[]; `kind`: `"test"`; `localExportUsages?`: `string`[]; `testCases`: [`FileTestCaseFact`](../interfaces/FileTestCaseFact.md)[]; \}

### exports

> **exports**: [`FileExportFact`](../interfaces/FileExportFact.md)[]

### imports

> **imports**: [`FileImportFact`](../interfaces/FileImportFact.md)[]

### kind

> **kind**: `"test"`

### localExportUsages?

> `optional` **localExportUsages**: `string`[]

### testCases

> **testCases**: [`FileTestCaseFact`](../interfaces/FileTestCaseFact.md)[]

\{ `exports`: [`FileExportFact`](../interfaces/FileExportFact.md)[]; `imports`: [`FileImportFact`](../interfaces/FileImportFact.md)[]; `kind`: `"sql-table"`; `localExportUsages?`: `string`[]; `tables`: [`FileTableFact`](../interfaces/FileTableFact.md)[]; \}

### exports

> **exports**: [`FileExportFact`](../interfaces/FileExportFact.md)[]

### imports

> **imports**: [`FileImportFact`](../interfaces/FileImportFact.md)[]

### kind

> **kind**: `"sql-table"`

### localExportUsages?

> `optional` **localExportUsages**: `string`[]

### tables

> **tables**: [`FileTableFact`](../interfaces/FileTableFact.md)[]
