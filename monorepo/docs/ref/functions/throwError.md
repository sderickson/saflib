[**@saflib/monorepo**](../index.md)

***

# Function: throwError()

> **throwError**\<`T`\>(`promise`, `ErrorClass`): `Promise`\<`NonUndefined`\<`T`\>\>

If a Promise which uses ReturnsError is unlikely to error,
use this function to throw a chained error and return the result.
**Use this function responsibly.**
By using it you declare "I bet this won't happen".

It will not throw the original error. Instead it will create a new
one with the caught error as the `cause`. You may provide your own
Error class.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `promise` | `Promise`\<[`ReturnsError`](../type-aliases/ReturnsError.md)\<`T`, `Error`\>\> | `undefined` |
| `ErrorClass` | (`message`, `options?`) => `Error` | `Error` |

## Returns

`Promise`\<`NonUndefined`\<`T`\>\>
