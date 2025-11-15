[**@saflib/identity-common**](../index.md)

---

# Interface: IdentityServiceCallbacks

Callbacks for events which occur in the identity service.
This is the main way to hook into the identity service.

## Properties

### onPasswordReset()?

> `optional` **onPasswordReset**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                                              |
| --------- | ------------------------------------------------- |
| `payload` | [`PasswordResetPayload`](PasswordResetPayload.md) |

#### Returns

`Promise`\<`void`\>

---

### onPasswordUpdated()?

> `optional` **onPasswordUpdated**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                                                  |
| --------- | ----------------------------------------------------- |
| `payload` | [`PasswordUpdatedPayload`](PasswordUpdatedPayload.md) |

#### Returns

`Promise`\<`void`\>

---

### onUserCreated()?

> `optional` **onUserCreated**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `payload` | [`UserCreatedPayload`](UserCreatedPayload.md) |

#### Returns

`Promise`\<`void`\>

---

### onUserVerified()?

> `optional` **onUserVerified**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                                            |
| --------- | ----------------------------------------------- |
| `payload` | [`UserVerifiedPayload`](UserVerifiedPayload.md) |

#### Returns

`Promise`\<`void`\>

---

### onVerificationTokenCreated()?

> `optional` **onVerificationTokenCreated**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                                                                    |
| --------- | ----------------------------------------------------------------------- |
| `payload` | [`VerificationTokenCreatedPayload`](VerificationTokenCreatedPayload.md) |

#### Returns

`Promise`\<`void`\>
