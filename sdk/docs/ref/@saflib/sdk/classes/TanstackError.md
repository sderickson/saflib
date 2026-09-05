[**@saflib/sdk**](../../../index.md)

---

# Class: TanstackError

Error returned by `handleClientMethod` so that Tanstack errors are always instances of this class.

## Extends

- `Error`

## Constructors

### Constructor

> **new TanstackError**(`status`, `code?`, `fields?`): `TanstackError`

#### Parameters

| Parameter | Type                            |
| --------- | ------------------------------- |
| `status`  | `number`                        |
| `code?`   | `string`                        |
| `fields?` | `Record`\<`string`, `unknown`\> |

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

> **code**: `string`

---

### fields

> **fields**: `Record`\<`string`, `unknown`>\>

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
