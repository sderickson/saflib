[**@saflib/vue**](../../../index.md)

---

# Function: registerProductEventConnector()

> **registerProductEventConnector**\<`T`>\>(`connector`): `void`

Register an optional sink for [commonEventLogger](../variables/commonEventLogger.md) (PostHog init,
dev backend ring buffer, etc.). Connectors run after built-in globals
(gtag, posthog global, test-mode cookie).

## Type Parameters

| Type Parameter                                                              |
| --------------------------------------------------------------------------- |
| `T` _extends_ [`ProductEventCommon`](../type-aliases/ProductEventCommon.md) |

## Parameters

| Parameter   | Type                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| `connector` | [`ProductEventConnector`](../type-aliases/ProductEventConnector.md)\<`T`\> |

## Returns

`void`
