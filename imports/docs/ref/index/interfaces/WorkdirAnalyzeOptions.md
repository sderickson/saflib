[**@saflib/imports**](../../index.md)

---

# Interface: WorkdirAnalyzeOptions

## Properties

### includeExportsCheck?

> `optional` **includeExportsCheck**: `boolean`

Include `checkExports` diffs as layout issues (default false).

---

### includeLayout?

> `optional` **includeLayout**: `boolean`

Include `checkPackageLayout` findings (default true).

---

### monorepoRoot

> **monorepoRoot**: `string`

Absolute monorepo root.

---

### packageNameMatch?

> `optional` **packageNameMatch**: `string`

When set, analyze every workspace package whose name contains this
substring (applied after `packageNames`, if any).

---

### packageNames?

> `optional` **packageNames**: `string`[]

Analyze only these workspace package names (empty = none).

---

### productRoot?

> `optional` **productRoot**: `string`

Repo-relative prefix limiting the file walk (e.g. `saflib/base`).
