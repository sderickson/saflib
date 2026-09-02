[**@saflib/node**](../../index.md)

---

# Class: AssertionUnknownKeyError

## Extends

- [`AssertionError`](AssertionError.md)

## Constructors

### Constructor

> **new AssertionUnknownKeyError**(`message`): `AssertionUnknownKeyError`

#### Parameters

| Parameter | Type     | Default value                        |
| --------- | -------- | ------------------------------------ |
| `message` | `string` | `"Unknown identity assertion keyId"` |

#### Returns

`AssertionUnknownKeyError`

#### Overrides

[`AssertionError`](AssertionError.md).[`constructor`](AssertionError.md#constructor)

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

[`AssertionError`](AssertionError.md).[`cause`](AssertionError.md#cause)

---

### message

> **message**: `string`

#### Inherited from

[`AssertionError`](AssertionError.md).[`message`](AssertionError.md#message)

---

### name

> **name**: `string`

#### Inherited from

[`AssertionError`](AssertionError.md).[`name`](AssertionError.md#name)

---

### stack?

> `optional` **stack**: `string`

#### Inherited from

[`AssertionError`](AssertionError.md).[`stack`](AssertionError.md#stack)

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

[`AssertionError`](AssertionError.md).[`prepareStackTrace`](AssertionError.md#preparestacktrace)

---

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

#### Inherited from

[`AssertionError`](AssertionError.md).[`stackTraceLimit`](AssertionError.md#stacktracelimit)

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

[`AssertionError`](AssertionError.md).[`captureStackTrace`](AssertionError.md#capturestacktrace)
