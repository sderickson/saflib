[**@saflib/ory-kratos-sdk**](../index.md)

---

# Class: SecurityCsrfViolation

Kratos returned HTTP 403 with `error.id === "security_csrf_violation"` — CSRF cookie/token mismatch.
Caller should restart the browser flow (new flow id) and optionally clear cookies per Kratos docs.

## Constructors

### Constructor

> **new SecurityCsrfViolation**(`data`): `SecurityCsrfViolation`

#### Parameters

| Parameter | Type      |
| --------- | --------- |
| `data`    | `unknown` |

#### Returns

`SecurityCsrfViolation`

## Properties

### data

> `readonly` **data**: `unknown`
