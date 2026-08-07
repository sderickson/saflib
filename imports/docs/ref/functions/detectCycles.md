[**@saflib/imports**](../index.md)

---

# Function: detectCycles()

> **detectCycles**(`options`): `object`

Detect circular dependencies among first-party modules via DFS back-edges.

## Parameters

| Parameter | Type                                                          |
| --------- | ------------------------------------------------------------- |
| `options` | [`DetectCyclesOptions`](../interfaces/DetectCyclesOptions.md) |

## Returns

`object`

### cycles

> **cycles**: [`Cycle`](../type-aliases/Cycle.md)[]

### error?

> `optional` **error**: `string`
