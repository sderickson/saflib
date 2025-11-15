[**@saflib/grpc**](../../../index.md)

---

# Function: wrapSimpleHandler()

> **wrapSimpleHandler**\<`Request`, `Response`\>(`handler`): (`call`, `callback`) => `Promise`\<`void`\>

## Type Parameters

| Type Parameter |
| -------------- |
| `Request`      |
| `Response`     |

## Parameters

| Parameter | Type                                   |
| --------- | -------------------------------------- |
| `handler` | (`request`) => `Promise`\<`Response`\> |

## Returns

> (`call`, `callback`): `Promise`\<`void`\>

### Parameters

| Parameter  | Type                                       |
| ---------- | ------------------------------------------ |
| `call`     | `ServerUnaryCall`\<`Request`, `Response`\> |
| `callback` | `sendUnaryData`\<`Response`\>              |

### Returns

`Promise`\<`void`\>
