[**@saflib/imports**](../../../../index.md)

---

# Function: buildReferenceGraph()

> **buildReferenceGraph**(`root?`): [`BuildReferenceGraphResult`](../interfaces/BuildReferenceGraphResult.md)

Build a package-level TypeScript project-reference graph from workspace
`dependencies`. Only packages with a typecheckable `tsconfig.json` become
nodes; edges to packages without a tsconfig are dropped.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `root?`   | `string` |

## Returns

[`BuildReferenceGraphResult`](../interfaces/BuildReferenceGraphResult.md)
