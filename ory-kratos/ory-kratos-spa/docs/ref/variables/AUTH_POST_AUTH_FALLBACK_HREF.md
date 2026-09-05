[**@saflib/ory-kratos-spa**](../index.md)

---

# Variable: AUTH\_POST\_AUTH\_FALLBACK\_HREF

> `const` **AUTH\_POST\_AUTH\_FALLBACK\_HREF**: `InjectionKey`\<`ComputedRef`\<`string`>>\>\>

Resolved post-auth fallback base URL from [configureAuthApp](../functions/configureAuthApp.md) (override, explicit fallback, or library default).
[AUTH\_POST\_AUTH\_URL\_IS\_OVERRIDE](AUTH_POST_AUTH_URL_IS_OVERRIDE.md) is true only when the shell set `postAuthOverrideHref` (then `?return_to=` is ignored).
