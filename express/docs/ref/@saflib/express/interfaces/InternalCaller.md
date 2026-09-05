[**@saflib/express**](../../../index.md)

---

# Interface: InternalCaller()

> **InternalCaller**(`input`): `Promise`\<`Response`>\>

## Parameters

| Parameter | Type                                                |
| --------- | --------------------------------------------------- |
| `input`   | [`InternalCallerRequest`](InternalCallerRequest.md) |

## Returns

`Promise`\<`Response`\>

## Properties

### close()

> **close**: () => `Promise`\<`void`>\>

Closes the underlying undici Agent (drains keep-alive sockets). Call in test teardown or when retiring the caller.

#### Returns

`Promise`\<`void`\>
