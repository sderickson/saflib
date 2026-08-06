[**@saflib/node**](../../index.md)

---

# Interface: Auth

Auth object passed in with every authenticated request.

## Properties

### emailVerified?

> `optional` **emailVerified**: `boolean`

---

### isAdmin?

> `optional` **isAdmin**: `boolean`

---

### mfaCompleted?

> `optional` **mfaCompleted**: `boolean`

True when the session is at AAL2 or AAL3 (e.g. password plus a second factor).
Used by HTTP auth middleware for `mfa-required` routes and admin routes.

---

### userEmail?

> `optional` **userEmail**: `string`

---

### userId

> **userId**: `string`

---

### userPhone?

> `optional` **userPhone**: `string`

From Kratos identity traits when present (e.g. phone).
