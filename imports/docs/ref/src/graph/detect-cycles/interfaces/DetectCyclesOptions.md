[**@saflib/imports**](../../../../index.md)

---

# Interface: DetectCyclesOptions

Shared options for graph walks (`measure`, `why`, `cycles`).

## Extends

- [`GraphWalkOptions`](../../../types/type-aliases/GraphWalkOptions.md)

## Properties

### includeTypes?

> `optional` **includeTypes**: `boolean`

When true, follow `import type` / `export type` edges. Default false.

#### Inherited from

`GraphWalkOptions.includeTypes`

---

### packageName?

> `optional` **packageName**: `string`

When set, only consider files belonging to this workspace package.

---

### root?

> `optional` **root**: `string`

Monorepo root; auto-detected from the entry file when omitted.

#### Inherited from

`GraphWalkOptions.root`

---

### verbose?

> `optional` **verbose**: `boolean`

When true, include sorted first-party paths and external package roots.

#### Inherited from

`GraphWalkOptions.verbose`
