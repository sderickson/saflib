[**@saflib/identity-db**](../index.md)

---

# Variable: emailAuthDb

> `const` **emailAuthDb**: `object`

Database queries for the email_auth table. The email_auth table contains email authentication information
for the users.

## Type declaration

### clearForgotPasswordToken()

> **clearForgotPasswordToken**: (`dbKey`, `userId`) => `Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `dbKey`   | `symbol` |
| `userId`  | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

### create()

> **create**: (`dbKey`, `auth`) => `Promise`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}\>

#### Parameters

| Parameter                            | Type                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dbKey`                              | `symbol`                                                                                                                                                                                                                                                                                           |
| `auth`                               | \{ `email`: `string`; `forgotPasswordToken?`: `null` \| `string`; `forgotPasswordTokenExpiresAt?`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken?`: `null` \| `string`; `verificationTokenExpiresAt?`: `null` \| `Date`; `verifiedAt?`: `null` \| `Date`; \} |
| `auth.email`                         | `string`                                                                                                                                                                                                                                                                                           |
| `auth.forgotPasswordToken?`          | `null` \| `string`                                                                                                                                                                                                                                                                                 |
| `auth.forgotPasswordTokenExpiresAt?` | `null` \| `Date`                                                                                                                                                                                                                                                                                   |
| `auth.passwordHash`                  | `unknown`                                                                                                                                                                                                                                                                                          |
| `auth.userId`                        | `string`                                                                                                                                                                                                                                                                                           |
| `auth.verificationToken?`            | `null` \| `string`                                                                                                                                                                                                                                                                                 |
| `auth.verificationTokenExpiresAt?`   | `null` \| `Date`                                                                                                                                                                                                                                                                                   |
| `auth.verifiedAt?`                   | `null` \| `Date`                                                                                                                                                                                                                                                                                   |

#### Returns

`Promise`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}\>

### getByEmail()

> **getByEmail**: (`dbKey`, `email`) => `Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `dbKey`   | `symbol` |
| `email`   | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

### getByForgotPasswordToken()

> **getByForgotPasswordToken**: (`dbKey`, `token`) => `Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`TokenNotFoundError`](../classes/TokenNotFoundError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `dbKey`   | `symbol` |
| `token`   | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`TokenNotFoundError`](../classes/TokenNotFoundError.md)\>\>

### getByVerificationToken()

> **getByVerificationToken**: (`dbKey`, `token`) => `Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`VerificationTokenNotFoundError`](../classes/VerificationTokenNotFoundError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `dbKey`   | `symbol` |
| `token`   | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`VerificationTokenNotFoundError`](../classes/VerificationTokenNotFoundError.md)\>\>

### getEmailAuthByUserIds()

> **getEmailAuthByUserIds**: (`dbKey`, `ids`) => `Promise`\<`object`[]\>

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `dbKey`   | `symbol`   |
| `ids`     | `string`[] |

#### Returns

`Promise`\<`object`[]\>

### updateEmail()

> **updateEmail**: (`dbKey`, `userId`, `newEmail`) => `Promise`\<`ReturnsError`\<[`UpdateEmailResult`](../type-aliases/UpdateEmailResult.md), [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md) \| [`EmailTakenError`](../classes/EmailTakenError.md)\>\>

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `dbKey`    | `symbol` |
| `userId`   | `string` |
| `newEmail` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<[`UpdateEmailResult`](../type-aliases/UpdateEmailResult.md), [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md) \| [`EmailTakenError`](../classes/EmailTakenError.md)\>\>

### updateForgotPasswordToken()

> **updateForgotPasswordToken**: (`dbKey`, `userId`, `forgotPasswordToken`, `forgotPasswordTokenExpiresAt`) => `Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

#### Parameters

| Parameter                      | Type               |
| ------------------------------ | ------------------ |
| `dbKey`                        | `symbol`           |
| `userId`                       | `string`           |
| `forgotPasswordToken`          | `null` \| `string` |
| `forgotPasswordTokenExpiresAt` | `null` \| `Date`   |

#### Returns

`Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

### updatePassword()

> **updatePassword**: (`dbKey`, `userId`, `passwordHash`) => `Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

#### Parameters

| Parameter      | Type         |
| -------------- | ------------ |
| `dbKey`        | `symbol`     |
| `userId`       | `string`     |
| `passwordHash` | `Uint8Array` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

### updatePasswordHash()

> **updatePasswordHash**: (`dbKey`, `userId`, `passwordHash`) => `Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

#### Parameters

| Parameter      | Type         |
| -------------- | ------------ |
| `dbKey`        | `symbol`     |
| `userId`       | `string`     |
| `passwordHash` | `Uint8Array` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

### updateVerificationToken()

> **updateVerificationToken**: (`dbKey`, `userId`, `verificationToken`, `verificationTokenExpiresAt`) => `Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

#### Parameters

| Parameter                    | Type     |
| ---------------------------- | -------- |
| `dbKey`                      | `symbol` |
| `userId`                     | `string` |
| `verificationToken`          | `string` |
| `verificationTokenExpiresAt` | `Date`   |

#### Returns

`Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

### verifyEmail()

> **verifyEmail**: (`dbKey`, `userId`) => `Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `dbKey`   | `symbol` |
| `userId`  | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `email`: `string`; `forgotPasswordToken`: `null` \| `string`; `forgotPasswordTokenExpiresAt`: `null` \| `Date`; `passwordHash`: `unknown`; `userId`: `string`; `verificationToken`: `null` \| `string`; `verificationTokenExpiresAt`: `null` \| `Date`; `verifiedAt`: `null` \| `Date`; \}, [`EmailAuthNotFoundError`](../classes/EmailAuthNotFoundError.md)\>\>
