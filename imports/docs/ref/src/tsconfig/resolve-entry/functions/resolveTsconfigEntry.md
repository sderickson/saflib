[**@saflib/imports**](../../../../index.md)

---

# Function: resolveTsconfigEntry()

> **resolveTsconfigEntry**(`packageDir`): `null` \| `string`

Resolve the TypeScript project-reference entry for a package directory.

External packages always reference the package-root `tsconfig.json` (never
`tsconfig.app.json` / `tsconfig.node.json` leaf configs). Returns `null` when
the package has no typecheckable tsconfig.

## Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `packageDir` | `string` |

## Returns

`null` \| `string`
