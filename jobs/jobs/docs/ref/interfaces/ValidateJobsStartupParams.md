[**@saflib/jobs**](../index.md)

---

# Interface: ValidateJobsStartupParams

## Properties

### operationConfig?

> `optional` **operationConfig**: [`JobOperationConfigMap`](../type-aliases/JobOperationConfigMap.md)

---

### operations

> **operations**: `OpenApiDocument` \| [`OperationMap`](../type-aliases/OperationMap.md)

Pre-built map, or the OpenAPI document to walk. Prefer passing a shared
`OperationMap` when the runtime will reuse it for delivery.

---

### triggerMap

> **triggerMap**: [`TriggerMap`](../type-aliases/TriggerMap.md)
