[**@saflib/ory-kratos-http**](../../index.md)

---

# Interface: KratosCourierCallbacks

Hooks for each supported **valid** template type. Unsupported / invalid templates are rejected before dispatch.

## Properties

### onLoginCodeValid()?

> `optional` **onLoginCodeValid**: (`payload`) => `Promise`\<`void`>\>

#### Parameters

| Parameter | Type                                                |
| --------- | --------------------------------------------------- |
| `payload` | [`LoginCodeValidPayload`](LoginCodeValidPayload.md) |

#### Returns

`Promise`\<`void`\>

---

### onRecoveryCodeValid()?

> `optional` **onRecoveryCodeValid**: (`payload`) => `Promise`\<`void`>\>

#### Parameters

| Parameter | Type                                                      |
| --------- | --------------------------------------------------------- |
| `payload` | [`RecoveryCodeValidPayload`](RecoveryCodeValidPayload.md) |

#### Returns

`Promise`\<`void`\>

---

### onRecoveryValid()?

> `optional` **onRecoveryValid**: (`payload`) => `Promise`\<`void`>\>

#### Parameters

| Parameter | Type                                              |
| --------- | ------------------------------------------------- |
| `payload` | [`RecoveryValidPayload`](RecoveryValidPayload.md) |

#### Returns

`Promise`\<`void`\>

---

### onRegistrationCodeValid()?

> `optional` **onRegistrationCodeValid**: (`payload`) => `Promise`\<`void`>\>

#### Parameters

| Parameter | Type                                                              |
| --------- | ----------------------------------------------------------------- |
| `payload` | [`RegistrationCodeValidPayload`](RegistrationCodeValidPayload.md) |

#### Returns

`Promise`\<`void`\>

---

### onVerificationCodeValid()?

> `optional` **onVerificationCodeValid**: (`payload`) => `Promise`\<`void`>\>

#### Parameters

| Parameter | Type                                                              |
| --------- | ----------------------------------------------------------------- |
| `payload` | [`VerificationCodeValidPayload`](VerificationCodeValidPayload.md) |

#### Returns

`Promise`\<`void`\>

---

### onVerificationValid()?

> `optional` **onVerificationValid**: (`payload`) => `Promise`\<`void`>\>

#### Parameters

| Parameter | Type                                                      |
| --------- | --------------------------------------------------------- |
| `payload` | [`VerificationValidPayload`](VerificationValidPayload.md) |

#### Returns

`Promise`\<`void`\>
