[**@saflib/identity**](../index.md)

---

# Interface: IdentityServiceCallbacks

Callbacks for events which occur in the identity service.
This is the main way to hook into the identity service.

## Properties

### onPasswordReset()?

> `optional` **onPasswordReset**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                   |
| --------- | ---------------------- |
| `payload` | `PasswordResetPayload` |

#### Returns

`Promise`\<`void`\>

---

### onPasswordUpdated()?

> `optional` **onPasswordUpdated**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `payload` | `PasswordUpdatedPayload` |

#### Returns

`Promise`\<`void`\>

---

### onUserCreated()?

> `optional` **onUserCreated**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                 |
| --------- | -------------------- |
| `payload` | `UserCreatedPayload` |

#### Returns

`Promise`\<`void`\>

---

### onUserVerified()?

> `optional` **onUserVerified**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                  |
| --------- | --------------------- |
| `payload` | `UserVerifiedPayload` |

#### Returns

`Promise`\<`void`\>

---

### onVerificationTokenCreated()?

> `optional` **onVerificationTokenCreated**: (`payload`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type                              |
| --------- | --------------------------------- |
| `payload` | `VerificationTokenCreatedPayload` |

#### Returns

`Promise`\<`void`\>
