[**@saflib/ory-kratos-sdk**](../index.md)

---

# Class: UnhandledResponse

Kratos returned another HTTP 4xx (not mapped to a dedicated result type yet).
Carries the status and parsed `response.data` for debugging or future handling.

## Constructors

### Constructor

> **new UnhandledResponse**(`status`, `data`): `UnhandledResponse`

#### Parameters

| Parameter | Type      |
| --------- | --------- |
| `status`  | `number`  |
| `data`    | `unknown` |

#### Returns

`UnhandledResponse`

## Properties

### data

> `readonly` **data**: `unknown`

---

### status

> `readonly` **status**: `number`
