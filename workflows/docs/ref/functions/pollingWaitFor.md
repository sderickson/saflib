[**@saflib/workflows**](../index.md)

---

# Function: pollingWaitFor()

> **pollingWaitFor**(`actor`, `condition`): `Promise`\<`unknown`\>

Something's weird about "waitFor" in xstate. If I use that, Node exits because apparently there's no promise or interval pending to keep it from exiting. So I'm resorting to a polling interval instead.

## Parameters

| Parameter   | Type                      |
| ----------- | ------------------------- |
| `actor`     | `AnyActor`                |
| `condition` | (`snapshot`) => `boolean` |

## Returns

`Promise`\<`unknown`\>
