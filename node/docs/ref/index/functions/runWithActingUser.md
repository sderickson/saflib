[**@saflib/node**](../../index.md)

---

# Function: runWithActingUser()

> **runWithActingUser**\<`T`\>(`userId`, `fn`): `Promise`\<`T`\>

Run `fn` with `auth.userId` set on the current [SafContext](../interfaces/SafContext.md). Use when a
request is anonymous (webhooks, jobs) but should be attributed to the user who
created the related resource for logging, analytics, and error reporting.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                          |
| --------- | ----------------------------- |
| `userId`  | `string`                      |
| `fn`      | () => `T` \| `Promise`\<`T`\> |

## Returns

`Promise`\<`T`\>
