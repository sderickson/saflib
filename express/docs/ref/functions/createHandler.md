[**@saflib/express**](../index.md)

***

# Function: createHandler()

> **createHandler**(`handler`): (`req`, `res`, `next`) => `void`

Wrapper for Express handlers. Promisifies the handler, ensuring any uncaught
exceptions get passed to `next`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`req`, `res`, `next`) => `Promise`\<`void`\> |

## Returns

> (`req`, `res`, `next`): `void`

### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | `Request` |
| `res` | `Response` |
| `next` | `NextFunction` |

### Returns

`void`
