[**@saflib/parser**](../index.md)

---

# Function: extractExports()

> **extractExports**(`source`): [`ExportEntry`](../interfaces/ExportEntry.md)[]

Extract exported symbols from TypeScript/JavaScript source using the syntactic
parser only (`ts.createSourceFile` — no type-checker, no `node_modules`).

Covers `export function` / `class` / `interface` / `type` / `const` (and
`let`/`var` as `"variable"`) / `enum`, plus `export { name }` / `export { name as
alias }` (named exports are tagged `"variable"` when kind can't be known from
the export clause alone). Skips `export * from` and default-export expressions
without a name.

Each entry includes a syntactic [ExportEntry.signature](../interfaces/ExportEntry.md#signature) for display/diff
and an optional [ExportEntry.docstring](../interfaces/ExportEntry.md#docstring) from leading JSDoc.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `source`  | `string` |

## Returns

[`ExportEntry`](../interfaces/ExportEntry.md)[]
