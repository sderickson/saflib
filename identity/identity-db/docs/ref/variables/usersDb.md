[**@saflib/identity-db**](../index.md)

***

# Variable: usersDb

> `const` **usersDb**: `object`

Database queries for the users table. The users table contains profile information about the users,
similar to the OIDC Standard Claims.

## Type declaration

### create()

> **create**: (`dbKey`, `user`) => `Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`EmailConflictError`](../classes/EmailConflictError.md)\>\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `user` | [`NewUser`](../type-aliases/NewUser.md) |

#### Returns

`Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`EmailConflictError`](../classes/EmailConflictError.md)\>\>

### getAll()

> **getAll**: (`dbKey`) => `Promise`\<`object`[]\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |

#### Returns

`Promise`\<`object`[]\>

### getByEmail()

> **getByEmail**: (`dbKey`, `email`) => `Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`UserNotFoundError`](../classes/UserNotFoundError.md)\>\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `email` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`UserNotFoundError`](../classes/UserNotFoundError.md)\>\>

### getById()

> **getById**: (`dbKey`, `id`) => `Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`UserNotFoundError`](../classes/UserNotFoundError.md)\>\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `id` | `number` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`UserNotFoundError`](../classes/UserNotFoundError.md)\>\>

### updateLastLogin()

> **updateLastLogin**: (`dbKey`, `id`) => `Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`UserNotFoundError`](../classes/UserNotFoundError.md)\>\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `id` | `number` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`UserNotFoundError`](../classes/UserNotFoundError.md)\>\>

### updateProfile()

> **updateProfile**: (`dbKey`, `userId`, `params`) => `Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`UserNotFoundError`](../classes/UserNotFoundError.md)\>\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `dbKey` | `symbol` |
| `userId` | `number` |
| `params` | [`UpdateProfileParams`](../type-aliases/UpdateProfileParams.md) |

#### Returns

`Promise`\<`ReturnsError`\<\{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \}, [`UserNotFoundError`](../classes/UserNotFoundError.md)\>\>
