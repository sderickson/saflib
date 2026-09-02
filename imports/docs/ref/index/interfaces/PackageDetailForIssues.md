[**@saflib/imports**](../../index.md)

---

# Interface: PackageDetailForIssues

## Properties

### dbInventory?

> `optional` **dbInventory**: `object`

#### entities

> **entities**: `object`[]

---

### directory?

> `optional` **directory**: `string`

---

### exports?

> `optional` **exports**: `object`[]

#### filePath

> **filePath**: `string`

#### kind

> **kind**: `string`

#### name

> **name**: `string`

#### usedBy?

> `optional` **usedBy**: `null` \| [`UsedBy`](../type-aliases/UsedBy.md)[]

---

### layoutIssues?

> `optional` **layoutIssues**: [`PackageIssue`](PackageIssue.md)[]

Layout / oversized findings (e.g. from `checkPackageLayout`).
Merged into the returned list so Spec UI and `--workdir` CLI share one collector.

---

### packageName

> **packageName**: `string`

---

### productRoot?

> `optional` **productRoot**: `string`

---

### publicExportFilePaths?

> `optional` **publicExportFilePaths**: `string`[]

Repo-relative files that `package.json` `exports` (SPA `main.ts`,
`./test-app`, …). Skipped for dead-code — they are public API.
