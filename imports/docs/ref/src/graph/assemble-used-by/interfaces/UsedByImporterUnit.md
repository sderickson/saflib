[**@saflib/imports**](../../../../index.md)

---

# Interface: UsedByImporterUnit

## Properties

### imports

> **imports**: `object`[]

#### names

> **names**: `string`[]

#### specifier

> **specifier**: `string`

---

### isTest

> **isTest**: `boolean`

---

### localExportUsages?

> `optional` **localExportUsages**: `string`[]

Export names this file references as values (beyond declarations).
Creates a same-file `usedBy` edge so in-file helpers aren't `dead-code`.

---

### packageDirectory

> **packageDirectory**: `string`

---

### packageName

> **packageName**: `string`

---

### path

> **path**: `string`

Repo-relative path.
