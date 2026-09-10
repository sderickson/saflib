[**@saflib/imports**](../../../index.md)

---

# Interface: MeasureGraphOptions

## Properties

### includeTypes?

> `optional` **includeTypes**: `boolean`

When true, follow `import type` / `export type` edges. Default false.

---

### root?

> `optional` **root**: `string`

Monorepo root; auto-detected from the entry file when omitted.

---

### verbose?

> `optional` **verbose**: `boolean`

When true, include sorted first-party paths and external package roots.
