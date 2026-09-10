[**@saflib/monorepo**](../../../index.md)

---

# Variable: ROOT\_TS\_ALLOWLIST

> `const` **ROOT\_TS\_ALLOWLIST**: `Set`\<`string`>\>

`.ts` / `.tsx` basenames always allowed at the package root.
Everything else should live in a thematic folder — unless it is a
direct package export target (see [isAllowedRootTsFile](../functions/isAllowedRootTsFile.md)).
