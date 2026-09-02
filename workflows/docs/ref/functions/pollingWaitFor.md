[**@saflib/workflows**](../index.md)

---

# Function: pollingWaitFor()

> **pollingWaitFor**(`actor`, `condition`, `options?`): `Promise`\<`unknown`\>

## Parameters

| Parameter             | Type                                                   |
| --------------------- | ------------------------------------------------------ |
| `actor`               | `AnyActor`                                             |
| `condition`           | (`snapshot`) => `boolean`                              |
| `options?`            | \{ `intervalMs?`: `number`; `timeoutMs?`: `number`; \} |
| `options.intervalMs?` | `number`                                               |
| `options.timeoutMs?`  | `number`                                               |

## Returns

`Promise`\<`unknown`\>
