[**@saflib/identity-db**](../index.md)

---

# Class: IdentityDatabaseError

## Extends

- `HandledDatabaseError`

## Extended by

- [`EmailAuthNotFoundError`](EmailAuthNotFoundError.md)
- [`EmailTakenError`](EmailTakenError.md)
- [`TokenNotFoundError`](TokenNotFoundError.md)
- [`VerificationTokenNotFoundError`](VerificationTokenNotFoundError.md)
- [`EmailConflictError`](EmailConflictError.md)
- [`UserNotFoundError`](UserNotFoundError.md)

## Constructors

### Constructor

> **new IdentityDatabaseError**(`message?`): `IdentityDatabaseError`

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `message?` | `string` |

#### Returns

`IdentityDatabaseError`

#### Inherited from

`HandledDatabaseError.constructor`

### Constructor

> **new IdentityDatabaseError**(`message?`, `options?`): `IdentityDatabaseError`

#### Parameters

| Parameter  | Type           |
| ---------- | -------------- |
| `message?` | `string`       |
| `options?` | `ErrorOptions` |

#### Returns

`IdentityDatabaseError`

#### Inherited from

`HandledDatabaseError.constructor`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`HandledDatabaseError.cause`

---

### message

> **message**: `string`

#### Inherited from

`HandledDatabaseError.message`

---

### name

> **name**: `string`

#### Inherited from

`HandledDatabaseError.name`

---

### stack?

> `optional` **stack**: `string`

#### Inherited from

`HandledDatabaseError.stack`

---

### prepareStackTrace()?

> `static` `optional` **prepareStackTrace**: (`err`, `stackTraces`) => `any`

Optional override for formatting stack traces

#### Parameters

| Parameter     | Type         |
| ------------- | ------------ |
| `err`         | `Error`      |
| `stackTraces` | `CallSite`[] |

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

`HandledDatabaseError.prepareStackTrace`

---

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

#### Inherited from

`HandledDatabaseError.stackTraceLimit`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Create .stack property on a target object

#### Parameters

| Parameter         | Type       |
| ----------------- | ---------- |
| `targetObject`    | `object`   |
| `constructorOpt?` | `Function` |

#### Returns

`void`

#### Inherited from

`HandledDatabaseError.captureStackTrace`
