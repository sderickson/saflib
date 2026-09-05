[**@saflib/ory-kratos-spa**](../index.md)

---

# Function: configureAuthApp()

> **configureAuthApp**(`options?`): `ComputedRef`\<[`AuthAppConfig`](../interfaces/AuthAppConfig.md)>\>

Call once from the auth shell (e.g. `AuthApp.vue`) to provide options for nested Kratos pages,
including post-auth, post-register, and logged-out root URLs.

## Parameters

| Parameter  | Type                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------- |
| `options?` | `MaybeRefOrGetter`\<[`ConfigureAuthAppOptions`](../interfaces/ConfigureAuthAppOptions.md)\> |

## Returns

`ComputedRef`\<[`AuthAppConfig`](../interfaces/AuthAppConfig.md)\>
