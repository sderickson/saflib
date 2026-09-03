[**@saflib/jobs**](../index.md)

---

# Interface: JobOperationConfig

Optional per-target-operation overrides. All fields optional; defaults come
from `src/constants.ts`.

## Properties

### maxAttempts?

> `optional` **maxAttempts**: `number`

Max delivery attempts before `dead` / exhausted.

---

### timeoutMs?

> `optional` **timeoutMs**: `number`

Per-attempt delivery timeout; must not exceed `TIMEOUT_CEILING_MS`.
