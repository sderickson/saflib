[**@saflib/jobs**](../index.md)

---

# Function: enqueue()

> **enqueue**(`params`, `options?`): `Promise`\<[`EnqueueResult`](../interfaces/EnqueueResult.md)>\>

Enqueue a background job under the current request's acting user.
Derives callingOperationId / originalRequestId from `getSafContext()`.

## Parameters

| Parameter  | Type                                                            |
| ---------- | --------------------------------------------------------------- |
| `params`   | [`EnqueueParams`](../interfaces/EnqueueParams.md)               |
| `options?` | [`EnqueueClientOptions`](../interfaces/EnqueueClientOptions.md) |

## Returns

`Promise`\<[`EnqueueResult`](../interfaces/EnqueueResult.md)\>
