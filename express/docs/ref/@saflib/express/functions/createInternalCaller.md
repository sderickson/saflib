[**@saflib/express**](../../../index.md)

---

# Function: createInternalCaller()

> **createInternalCaller**(`options`): [`InternalCaller`](../interfaces/InternalCaller.md)

Creates a low-level fetch-compatible client that signs a per-request identity
assertion and dispatches over a unix domain socket.

Untyped by design — higher layers (e.g. jobs runtime) wrap this with
openapi-fetch or similar.

## Parameters

| Parameter | Type                                                                          |
| --------- | ----------------------------------------------------------------------------- |
| `options` | [`CreateInternalCallerOptions`](../interfaces/CreateInternalCallerOptions.md) |

## Returns

[`InternalCaller`](../interfaces/InternalCaller.md)
