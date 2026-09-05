[**@saflib/monorepo**](../../../index.md)

---

# Variable: PACKAGE\_KINDS

> `const` **PACKAGE\_KINDS**: readonly \[`"db"`, `"http"`, `"spec"`, `"spa"`, `"sdk"`, `"lib"`, `"integration"`, `"other"`\]

Product package kinds for inventory / layout.

Prefer an explicit `package.json` `saf.kind`. Otherwise infer from a unique
identifier dependency (`@saflib/drizzle` → db, and so on). Mixing drizzle /
express / openapi in one package is a layout error — those layers should
stay in separate packages.
