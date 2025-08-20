[**@saflib/identity-common**](../index.md)

***

# Interface: IdentityServiceCallbacks

## Properties

### onPasswordReset()?

> `optional` **onPasswordReset**: (`user`, `resetUrl`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `user` | \{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \} |
| `user.createdAt` | `Date` |
| `user.email` | `string` |
| `user.emailVerified` | `null` \| `boolean` |
| `user.familyName` | `null` \| `string` |
| `user.givenName` | `null` \| `string` |
| `user.id` | `number` |
| `user.lastLoginAt` | `null` \| `Date` |
| `user.name` | `null` \| `string` |
| `resetUrl` | `string` |

#### Returns

`Promise`\<`void`\>

***

### onPasswordUpdated()?

> `optional` **onPasswordUpdated**: (`user`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `user` | \{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \} |
| `user.createdAt` | `Date` |
| `user.email` | `string` |
| `user.emailVerified` | `null` \| `boolean` |
| `user.familyName` | `null` \| `string` |
| `user.givenName` | `null` \| `string` |
| `user.id` | `number` |
| `user.lastLoginAt` | `null` \| `Date` |
| `user.name` | `null` \| `string` |

#### Returns

`Promise`\<`void`\>

***

### onUserCreated()?

> `optional` **onUserCreated**: (`user`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `user` | \{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \} |
| `user.createdAt` | `Date` |
| `user.email` | `string` |
| `user.emailVerified` | `null` \| `boolean` |
| `user.familyName` | `null` \| `string` |
| `user.givenName` | `null` \| `string` |
| `user.id` | `number` |
| `user.lastLoginAt` | `null` \| `Date` |
| `user.name` | `null` \| `string` |

#### Returns

`Promise`\<`void`\>

***

### onVerificationTokenCreated()?

> `optional` **onVerificationTokenCreated**: (`user`, `verificationUrl`, `isResend`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `user` | \{ `createdAt`: `Date`; `email`: `string`; `emailVerified`: `null` \| `boolean`; `familyName`: `null` \| `string`; `givenName`: `null` \| `string`; `id`: `number`; `lastLoginAt`: `null` \| `Date`; `name`: `null` \| `string`; \} |
| `user.createdAt` | `Date` |
| `user.email` | `string` |
| `user.emailVerified` | `null` \| `boolean` |
| `user.familyName` | `null` \| `string` |
| `user.givenName` | `null` \| `string` |
| `user.id` | `number` |
| `user.lastLoginAt` | `null` \| `Date` |
| `user.name` | `null` \| `string` |
| `verificationUrl` | `string` |
| `isResend` | `boolean` |

#### Returns

`Promise`\<`void`\>
