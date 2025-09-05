[**@saflib/sdk**](../../../index.md)

---

# Class: TanstackError

Error returned by `handleClientMethod` so that Tanstack errors are always instances of this class.

## Extends

- `Error`

## Constructors

### Constructor

> **new TanstackError**(`status`, `code?`): `TanstackError`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `status`  | `number` |
| `code?`   | `string` |

#### Returns

`TanstackError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause**: `unknown`

#### Inherited from

`Error.cause`

---

### code

> **code**: `undefined` \| `string`

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

### status

> **status**: `number`

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
