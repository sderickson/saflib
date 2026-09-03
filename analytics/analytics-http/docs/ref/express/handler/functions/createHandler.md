[**@saflib/analytics-http**](../../../index.md)

---

# Function: createHandler()

> **createHandler**(`handler`): `RequestHandler`

Promisified Express handler — avoids a dependency on `@saflib/express`.

## Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `handler` | (`req`, `res`, `next`) => `Promise`\<`void`\> |

## Returns

`RequestHandler`
