[**@saflib/git**](../index.md)

---

# Function: listTree()

> **listTree**(`repoRoot`, `commitHash`): `ReturnsError`\<[`GitTreeEntry`](../interfaces/GitTreeEntry.md)[], [`GitCommandError`](../classes/GitCommandError.md)>\>

List every blob at `commitHash` (recursive) without checking anything out.
Directories / trees / commits / tags are skipped — only `blob` entries are
returned. Paths are relative to the repo root.

## Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `repoRoot`   | `string` |
| `commitHash` | `string` |

## Returns

`ReturnsError`\<[`GitTreeEntry`](../interfaces/GitTreeEntry.md)[], [`GitCommandError`](../classes/GitCommandError.md)\>
