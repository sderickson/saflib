[**@saflib/parser**](../index.md)

---

# Interface: ExportEntry

One exported symbol found by [extractExports](../functions/extractExports.md).

## Properties

### docstring

> **docstring**: `null` \| `string`

First prose line of the leading JSDoc block, or `null` when absent
(including bare re-exports like `export { a }`).

---

### kind

> **kind**: [`ExportKind`](../type-aliases/ExportKind.md)

---

### name

> **name**: `string`

---

### signature

> **signature**: `null` \| `string`

Syntactic display signature (no type-checker).
Examples: `(a: number, b: string) => Promise<void>`, `{ name: string }`, `= 1`.
`null` when the local declaration has no useful surface (e.g. `export { a }` re-export).
