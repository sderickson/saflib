**@saflib/parser**

---

# @saflib/parser

## Interfaces

| Interface                                              | Description                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [DrizzleTableColumn](interfaces/DrizzleTableColumn.md) | One column inside a drizzle table definition.                                                                            |
| [DrizzleTableEntry](interfaces/DrizzleTableEntry.md)   | One drizzle `sqliteTable` / `pgTable` / `mysqlTable` found by [extractDrizzleTables](functions/extractDrizzleTables.md). |
| [ExportEntry](interfaces/ExportEntry.md)               | One exported symbol found by [extractExports](functions/extractExports.md).                                              |
| [ImportEntry](interfaces/ImportEntry.md)               | One static import / re-export-from found by [extractImports](functions/extractImports.md).                               |
| [TestCaseEntry](interfaces/TestCaseEntry.md)           | One test case found by [extractTestCases](functions/extractTestCases.md).                                                |
| [VueSfcSurface](interfaces/VueSfcSurface.md)           | -                                                                                                                        |

## Type Aliases

| Type Alias                               | Description                             |
| ---------------------------------------- | --------------------------------------- |
| [ExportKind](type-aliases/ExportKind.md) | Kind of a top-level export declaration. |

## Functions

| Function                                                          | Description                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [extractDrizzleTables](functions/extractDrizzleTables.md)         | Extract drizzle `sqliteTable` / `pgTable` / `mysqlTable` definitions from TypeScript source using the syntactic parser only (no type-checker).                                                                      |
| [extractExports](functions/extractExports.md)                     | Extract exported symbols from TypeScript/JavaScript source using the syntactic parser only (`ts.createSourceFile` — no type-checker, no `node_modules`).                                                            |
| [extractImports](functions/extractImports.md)                     | Extract static import declarations from TypeScript/JavaScript source using the syntactic parser only (no type-checker).                                                                                             |
| [extractLocalExportUsages](functions/extractLocalExportUsages.md) | Export names that are referenced as **values** elsewhere in the same file (beyond their declaration). Used so same-file helpers aren't false `dead-code` (they get a self `usedBy` edge and are otherwise ignored). |
| [extractTestCases](functions/extractTestCases.md)                 | Extract `describe` / `it` / `test` cases from source using the syntactic parser only. Nested `describe` titles are joined onto the leaf title with `" > "`.                                                         |
| [extractVueRootTag](functions/extractVueRootTag.md)               | First tag name in the SFC's root `<template>` block, skipping comments and whitespace. `null` when the template is empty or absent.                                                                                 |
| [extractVueScript](functions/extractVueScript.md)                 | Concatenate inner text of every `<script>` block (setup + optional extra).                                                                                                                                          |
| [extractVueSfc](functions/extractVueSfc.md)                       | Extract `<script>` text plus `defineProps` / `defineEmits` / `defineModel` members as `prop` / `emit` / `model` export entries (syntactic only).                                                                    |
| [isVueSfc](functions/isVueSfc.md)                                 | True when `source` looks like a Vue SFC (script + template, or `<script setup>`). Used by path-agnostic blob parsing where the filename is not available.                                                           |
