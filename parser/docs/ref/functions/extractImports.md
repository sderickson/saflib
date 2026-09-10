[**@saflib/parser**](../index.md)

---

# Function: extractImports()

> **extractImports**(`source`): [`ImportEntry`](../interfaces/ImportEntry.md)[]

Extract static import declarations from TypeScript/JavaScript source using
the syntactic parser only (no type-checker).

Covers `import … from "…"`, `import "…"`, and `export … from "…"`
(re-export as an inbound edge). Skips dynamic `import()`.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `source`  | `string` |

## Returns

[`ImportEntry`](../interfaces/ImportEntry.md)[]
