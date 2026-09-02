[**@saflib/imports**](../../../../index.md)

---

# Interface: BuildReferenceGraphResult

## Properties

### context

> **context**: `MonorepoContext`

---

### graph

> **graph**: [`ReferenceGraph`](../type-aliases/ReferenceGraph.md)

---

### missingTsconfig

> **missingTsconfig**: `string`[]

Workspace packages skipped because they lack a tsconfig.json.

---

### rootDir

> **rootDir**: `string`

---

### skippedMeta

> **skippedMeta**: `string`[]

Meta / root / fixture / gitignored packages skipped from the graph.
