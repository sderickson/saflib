[**@saflib/drizzle**](../index.md)

---

# Class: HandledDatabaseError

A subclass of `Error` which is used to indicate that an error was caught and
handled by the database library. Database packages should subclass this error,
and these are not necessarily considered bugs if they occur.

## Extends

- `Error`

## Constructors

### Constructor

> **new HandledDatabaseError**(`message?`): `HandledDatabaseError`

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `message?` | `string` |

#### Returns

`HandledDatabaseError`

#### Inherited from

`Error.constructor`

### Constructor

> **new HandledDatabaseError**(`message?`, `options?`): `HandledDatabaseError`

#### Parameters

| Parameter  | Type           |
| ---------- | -------------- |
| `message?` | `string`       |
| `options?` | `ErrorOptions` |

#### Returns

`HandledDatabaseError`

#### Inherited from

`Error.constructor`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`Error.cause`

---

### message

> **message**: `string`

#### Inherited from

`Error.message`

---

### name

> **name**: `string`

#### Inherited from

`Error.name`

---

### stack?

> `optional` **stack**: `string`

#### Inherited from

`Error.stack`

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

`Error.prepareStackTrace`

---

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

#### Inherited from

`Error.stackTraceLimit`

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

`Error.captureStackTrace`
