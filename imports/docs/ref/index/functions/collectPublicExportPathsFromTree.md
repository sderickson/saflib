[**@saflib/imports**](../../index.md)

---

# Function: collectPublicExportPathsFromTree()

> **collectPublicExportPathsFromTree**(`packageRepoPath`, `exports`, `treePaths`): `string`[]

Repo-relative paths that are public `package.json` export targets, derived
from a commit tree (no filesystem).

## Parameters

| Parameter         | Type              |
| ----------------- | ----------------- |
| `packageRepoPath` | `string`          |
| `exports`         | `unknown`         |
| `treePaths`       | `Set`\<`string`\> |

## Returns

`string`[]
