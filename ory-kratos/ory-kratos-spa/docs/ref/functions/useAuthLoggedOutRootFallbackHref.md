[**@saflib/ory-kratos-spa**](../index.md)

---

# Function: useAuthLoggedOutRootFallbackHref()

> **useAuthLoggedOutRootFallbackHref**(): `ComputedRef`\<`string`>\>

After logout: when the shell set `rootHomeOverrideHref`, that URL is used and `?return_to=` is ignored.
Otherwise `?return_to=` wins, then the resolved default URL.

## Returns

`ComputedRef`\<`string`\>
