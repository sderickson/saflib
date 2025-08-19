[**@saflib/cron-db**](../index.md)

***

# Class: JobSettingNotFoundError

## Extends

- [`CronDatabaseError`](CronDatabaseError.md)

## Constructors

### Constructor

> **new JobSettingNotFoundError**(`jobName`): `JobSettingNotFoundError`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `jobName` | `string` |

#### Returns

`JobSettingNotFoundError`

#### Overrides

[`CronDatabaseError`](CronDatabaseError.md).[`constructor`](CronDatabaseError.md#constructor)

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

[`CronDatabaseError`](CronDatabaseError.md).[`cause`](CronDatabaseError.md#cause)

***

### message

> **message**: `string`

#### Inherited from

[`CronDatabaseError`](CronDatabaseError.md).[`message`](CronDatabaseError.md#message)

***

### name

> **name**: `string`

#### Inherited from

[`CronDatabaseError`](CronDatabaseError.md).[`name`](CronDatabaseError.md#name)

***

### stack?

> `optional` **stack**: `string`

#### Inherited from

[`CronDatabaseError`](CronDatabaseError.md).[`stack`](CronDatabaseError.md#stack)

***

### prepareStackTrace()?

> `static` `optional` **prepareStackTrace**: (`err`, `stackTraces`) => `any`

Optional override for formatting stack traces

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `err` | `Error` |
| `stackTraces` | `CallSite`[] |

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

[`CronDatabaseError`](CronDatabaseError.md).[`prepareStackTrace`](CronDatabaseError.md#preparestacktrace)

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

#### Inherited from

[`CronDatabaseError`](CronDatabaseError.md).[`stackTraceLimit`](CronDatabaseError.md#stacktracelimit)

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Create .stack property on a target object

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetObject` | `object` |
| `constructorOpt?` | `Function` |

#### Returns

`void`

#### Inherited from

[`CronDatabaseError`](CronDatabaseError.md).[`captureStackTrace`](CronDatabaseError.md#capturestacktrace)
