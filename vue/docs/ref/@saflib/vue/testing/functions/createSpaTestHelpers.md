[**@saflib/vue**](../../../../index.md)

---

# Function: createSpaTestHelpers()

> **createSpaTestHelpers**(`options`): `object`

Shared `createTestRouter` / `mountTestApp` pair used by product SPA packages.

## Parameters

| Parameter | Type                                                                          |
| --------- | ----------------------------------------------------------------------------- |
| `options` | [`CreateSpaTestHelpersOptions`](../interfaces/CreateSpaTestHelpersOptions.md) |

## Returns

`object`

### createTestRouter()

> **createTestRouter**: () => `RouterClassic`

#### Returns

`RouterClassic`

### mountTestApp()

> **mountTestApp**: \<`C`>\>(`Component`, `mountOptions?`, `overrides?`) => `VueWrapper`\<`any`, `any`>\>

#### Type Parameters

| Type Parameter            |
| ------------------------- |
| `C` _extends_ `Component` |

#### Parameters

| Parameter           | Type                              |
| ------------------- | --------------------------------- |
| `Component`         | `C`                               |
| `mountOptions?`     | `ComponentMountingOptions`\<`C`\> |
| `overrides?`        | \{ `router?`: `RouterClassic`; \} |
| `overrides.router?` | `RouterClassic`                   |

#### Returns

`VueWrapper`\<`any`, `any`\>
