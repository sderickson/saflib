[**@saflib/imports**](../../../index.md)

---

# Interface: MeasureGraphResult

## Properties

### ext

> **ext**: `number`

Distinct external npm package roots.

---

### externals?

> `optional` **externals**: `string`[]

Sorted external package roots (only when `verbose: true`).

---

### files?

> `optional` **files**: `string`[]

Repo-root-relative first-party paths (only when `verbose: true`).

---

### lines

> **lines**: `number`

Total line count across visited first-party files.

---

### modules

> **modules**: `number`

First-party workspace modules reachable from the entry.
