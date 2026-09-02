[**@saflib/monorepo**](../../../index.md)

---

# Variable: ROOT_TS_ALLOWLIST

> `const` **ROOT_TS_ALLOWLIST**: `Set`\<`string`\>

`.ts` / `.tsx` basenames always allowed at the package root.
Everything else should live in a thematic folder — unless it is a
direct package export target (see [isAllowedRootTsFile](../functions/isAllowedRootTsFile.md)).
