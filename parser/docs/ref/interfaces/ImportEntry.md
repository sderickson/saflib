[**@saflib/parser**](../index.md)

---

# Interface: ImportEntry

One static import / re-export-from found by [extractImports](../functions/extractImports.md).

## Properties

### names

> **names**: `string`[]

Exported names pulled from the module. Empty for side-effect-only imports.
`"default"` for default import; `"*"` for namespace / `export *`.

---

### specifier

> **specifier**: `string`

Module specifier string as written (`@scope/pkg/…` or relative).
