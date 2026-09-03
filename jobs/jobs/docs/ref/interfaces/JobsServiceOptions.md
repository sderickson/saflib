[**@saflib/jobs**](../index.md)

---

# Interface: JobsServiceOptions

Options passed when starting the jobs service / creating its surfaces.

## Properties

### apiSpec

> **apiSpec**: `OpenApiDocument`

Bundled product OpenAPI document used to resolve operation_id → method/path
and to validate `background` tags / known ids at startup.

---

### dbKey?

> `optional` **dbKey**: `symbol`

Key for an already-connected jobs DB. Prefer this when sharing a connection
(e.g. admin router + runtime in one process).

---

### dbOptions?

> `optional` **dbOptions**: `DbOptions`

Options to connect the jobs DB when `dbKey` is not provided.

---

### operationConfig?

> `optional` **operationConfig**: [`JobOperationConfigMap`](../type-aliases/JobOperationConfigMap.md)

Optional per-target overrides (timeout, maxAttempts).

---

### targetSocketPath

> **targetSocketPath**: `string`

Unix socket path of the target app (M1 internal listener) for delivery.

---

### triggerMap

> **triggerMap**: [`TriggerMap`](../type-aliases/TriggerMap.md)

Reviewed map of which operations may enqueue which operations.
