[**@saflib/identity-db**](../index.md)

---

# Class: TokenNotFoundError

## Extends

- [`IdentityDatabaseError`](IdentityDatabaseError.md)

## Constructors

### Constructor

> **new TokenNotFoundError**(`message?`): `TokenNotFoundError`

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `message?` | `string` |

#### Returns

`TokenNotFoundError`

#### Inherited from

[`IdentityDatabaseError`](IdentityDatabaseError.md).[`constructor`](IdentityDatabaseError.md#constructor)

### Constructor

> **new TokenNotFoundError**(`message?`, `options?`): `TokenNotFoundError`

#### Parameters

| Parameter  | Type           |
| ---------- | -------------- |
| `message?` | `string`       |
| `options?` | `ErrorOptions` |

#### Returns

`TokenNotFoundError`

#### Inherited from

[`IdentityDatabaseError`](IdentityDatabaseError.md).[`constructor`](IdentityDatabaseError.md#constructor)

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

[`IdentityDatabaseError`](IdentityDatabaseError.md).[`cause`](IdentityDatabaseError.md#cause)

---

### message

> **message**: `string`

#### Inherited from

[`IdentityDatabaseError`](IdentityDatabaseError.md).[`message`](IdentityDatabaseError.md#message)

---

### name

> **name**: `string`

#### Inherited from

[`IdentityDatabaseError`](IdentityDatabaseError.md).[`name`](IdentityDatabaseError.md#name)

---

### stack?

> `optional` **stack**: `string`

#### Inherited from

[`IdentityDatabaseError`](IdentityDatabaseError.md).[`stack`](IdentityDatabaseError.md#stack)

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

[`IdentityDatabaseError`](IdentityDatabaseError.md).[`prepareStackTrace`](IdentityDatabaseError.md#preparestacktrace)

---

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

#### Inherited from

[`IdentityDatabaseError`](IdentityDatabaseError.md).[`stackTraceLimit`](IdentityDatabaseError.md#stacktracelimit)

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

[`IdentityDatabaseError`](IdentityDatabaseError.md).[`captureStackTrace`](IdentityDatabaseError.md#capturestacktrace)
