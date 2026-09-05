[**@saflib/monorepo**](../../../../index.md)

---

# Function: collectPublicExportRepoPaths()

> **collectPublicExportRepoPaths**(`packageDir`, `packageRepoPath`): `string`[]

Repo-relative paths of source files that are direct `package.json` export
targets (including pattern exports). Used to skip dead-code on public API.

## Parameters

| Parameter         | Type     |
| ----------------- | -------- |
| `packageDir`      | `string` |
| `packageRepoPath` | `string` |

## Returns

`string`[]
