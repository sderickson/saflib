[**@saflib/express**](../index.md)

---

# Function: drainRequest()

> **drainRequest**(`req`): `Promise`\<`void`>\>

Drain the request body so the client can finish sending (e.g. multipart
upload). Call before sending 401/403 to avoid EPIPE when the client closes
after receiving the response while the body was still streaming.

## Parameters

| Parameter | Type                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| `req`     | `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\> |

## Returns

`Promise`\<`void`\>
