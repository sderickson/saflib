[**@saflib/jobs-http**](../index.md)

---

# Function: enqueueOnBehalfOf()

> **enqueueOnBehalfOf**(`params`, `options?`): `Promise`\<[`EnqueueResult`](../interfaces/EnqueueResult.md)>\>

Enqueue under an explicit user + authority evidence — typically after attributing
an inbound event (webhook, etc.) to a stored product resource.

## Parameters

| Parameter  | Type                                                                  |
| ---------- | --------------------------------------------------------------------- |
| `params`   | [`EnqueueOnBehalfOfParams`](../interfaces/EnqueueOnBehalfOfParams.md) |
| `options?` | [`EnqueueClientOptions`](../interfaces/EnqueueClientOptions.md)       |

## Returns

`Promise`\<[`EnqueueResult`](../interfaces/EnqueueResult.md)\>
