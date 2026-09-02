[**@saflib/imports**](../../../../index.md)

---

# Function: computeSolutions()

> **computeSolutions**(`built`): [`SolutionReferencePreview`](../interfaces/SolutionReferencePreview.md)[]

Compute solution-style root configs for the given monorepo scope.

- product root (nested `saflib/`) → `{ "./saflib" }` hub + product leaves; also emits saflib nested solution
- saflib root → every saflib leaf
- generic fixture → every typecheckable package

## Parameters

| Parameter | Type                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- |
| `built`   | [`BuildReferenceGraphResult`](../../build-graph/interfaces/BuildReferenceGraphResult.md) |

## Returns

[`SolutionReferencePreview`](../interfaces/SolutionReferencePreview.md)[]
