[**@saflib/ory-kratos-spa**](../index.md)

---

# Function: useAuthPostAuthFallbackHref()

> **useAuthPostAuthFallbackHref**(): `ComputedRef`\<`string`>\>

After login / post-auth: when the shell set `postAuthOverrideHref`, that URL is used and `?return_to=` is ignored.
Otherwise `?return_to=` wins when present, then the resolved fallback URL (`postAuthFallbackHref`, else library default).

## Returns

`ComputedRef`\<`string`\>
