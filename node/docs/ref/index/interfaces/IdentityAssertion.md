[**@saflib/node**](../../index.md)

---

# Interface: IdentityAssertion

## Properties

### claims?

> `optional` **claims**: `Record`\<`string`, `string`\>

Extension point; M2 binds jobId + attempt here.

---

### expiresAt

> **expiresAt**: `number`

Epoch milliseconds when the assertion expires.

---

### issuedAt

> **issuedAt**: `number`

Epoch milliseconds when the assertion was issued.

---

### mfaCompleted?

> `optional` **mfaCompleted**: `boolean`

Snapshot of MFA completion from the originating context.

---

### requestId?

> `optional` **requestId**: `string`

Caller's request id (propagated for logging/lineage).

---

### targetOperationId

> **targetOperationId**: `string`

OpenAPI operationId this assertion is valid for.

---

### userId

> **userId**: `string`

Whose authority the assertion carries.
