[**@saflib/express**](../../../index.md)

---

# Function: createHandler()

> **createHandler**(`handler`): `RequestHandler`

Wrapper for Express handlers. Promisifies the handler, ensuring any uncaught
exceptions get passed to `next`.

## Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `handler` | (`req`, `res`, `next`) => `Promise`\<`void`\> |

## Returns

`RequestHandler`
