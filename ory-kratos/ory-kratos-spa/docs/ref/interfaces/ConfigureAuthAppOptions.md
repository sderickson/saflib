[**@saflib/ory-kratos-spa**](../index.md)

---

# Interface: ConfigureAuthAppOptions

## Extends

- `Partial`\<[`AuthAppConfig`](AuthAppConfig.md)\>

## Properties

### onBeforeLogout()?

> `optional` **onBeforeLogout**: () => `void`

Called immediately before starting the Kratos browser logout redirect
(e.g. clear product cookies that should not survive sign-out).

#### Returns

`void`

---

### postAuthFallbackHref?

> `optional` **postAuthFallbackHref**: `MaybeRefOrGetter`\<`string`>\>

Default URL after login when `?return_to=` is absent. When set, `?return_to=` is still honored when present.
Prefer this over `postAuthOverrideHref` when deep links (e.g. “sell a part” with `return_to`) should win.
When omitted, the library default app home URL is used as that fallback.

---

### postAuthOverrideHref?

> `optional` **postAuthOverrideHref**: `MaybeRefOrGetter`\<`string`>\>

When set, post-login redirects always use this URL and `?return_to=` is ignored.
If both this and `postAuthFallbackHref` are set, this wins.

---

### postRecoverySettingsHref?

> `optional` **postRecoverySettingsHref**: `MaybeRefOrGetter`\<(`settingsFlowId`) => `string`>\>

Builds the absolute URL for recovery `show_settings_ui` when Kratos omits `flow.url`.
Defaults to auth `/settings?flow=…`. Set this when settings live on account
(e.g. password page with `?flow=`).

---

### postRegisterFallbackHref?

> `optional` **postRegisterFallbackHref**: `MaybeRefOrGetter`\<`string`>\>

Default URL after registration when `?return_to=` is absent. When set, `?return_to=` is still
honored when present. Prefer this over `postRegisterOverrideHref` when deep links should win.
When omitted, the library default app home URL is used as that fallback.

---

### postRegisterOverrideHref?

> `optional` **postRegisterOverrideHref**: `MaybeRefOrGetter`\<`string`>\>

When set, this URL is used after registration (and on the verify wall) and `?return_to=` is ignored.
When omitted, `?return_to=` is honored, then the fallback URL.
See [AUTH\_POST\_REGISTER\_FALLBACK\_HREF](../variables/AUTH_POST_REGISTER_FALLBACK_HREF.md).

---

### requireMfaAfterLogin?

> `optional` **requireMfaAfterLogin**: `boolean`

#### See

[AuthAppConfig.requireMfaAfterLogin](AuthAppConfig.md#requiremfaafterlogin)

#### Overrides

[`AuthAppConfig`](AuthAppConfig.md).[`requireMfaAfterLogin`](AuthAppConfig.md#requiremfaafterlogin)

---

### rootHomeOverrideHref?

> `optional` **rootHomeOverrideHref**: `MaybeRefOrGetter`\<`string`>\>

When set, this URL is used after logout and `?return_to=` is ignored.
When omitted, `?return_to=` is honored, then the default root home URL.
See [AUTH\_ROOT\_HOME\_FALLBACK\_HREF](../variables/AUTH_ROOT_HOME_FALLBACK_HREF.md).

---

### showFlowHeaders?

> `optional` **showFlowHeaders**: `boolean`

When false, Kratos flow pages hide built-in H1 titles (e.g. "Create your account")
so a host layout can supply its own headings.

#### Inherited from

[`AuthAppConfig`](AuthAppConfig.md).[`showFlowHeaders`](AuthAppConfig.md#showflowheaders)
