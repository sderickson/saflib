[**@saflib/cron-db**](../index.md)

---

# Class: CronDatabaseError

Superclass for all handled cron db errors

## Extends

- `HandledDatabaseError`

## Extended by

- [`JobSettingNotFoundError`](JobSettingNotFoundError.md)

## Constructors

### Constructor

> **new CronDatabaseError**(`message?`): `CronDatabaseError`

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `message?` | `string` |

#### Returns

`CronDatabaseError`

#### Inherited from

`HandledDatabaseError.constructor`

### Constructor

> **new CronDatabaseError**(`message?`, `options?`): `CronDatabaseError`

#### Parameters

| Parameter  | Type           |
| ---------- | -------------- |
| `message?` | `string`       |
| `options?` | `ErrorOptions` |

#### Returns

`CronDatabaseError`

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
