[**@saflib/ory-kratos-spa**](../index.md)

---

# Function: useAuthPostRegisterFallbackHref()

> **useAuthPostRegisterFallbackHref**(): `ComputedRef`\<`string`>\>

After registration: when the shell set `postRegisterOverrideHref`, that URL is used and `?return_to=` is ignored.
Otherwise `?return_to=` wins, then the resolved default URL.

## Returns

`ComputedRef`\<`string`\>
