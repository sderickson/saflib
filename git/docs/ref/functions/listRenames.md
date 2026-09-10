[**@saflib/git**](../index.md)

---

# Function: listRenames()

> **listRenames**(`repoRoot`, `fromRef`, `toRef`): `ReturnsError`\<`GitRename`[], [`GitCommandError`](../classes/GitCommandError.md)>\>

File rename pairs from `fromRef` to `toRef` (`git diff --find-renames -z --name-status --diff-filter=R`).

## Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `repoRoot` | `string` |
| `fromRef`  | `string` |
| `toRef`    | `string` |

## Returns

`ReturnsError`\<`GitRename`[], [`GitCommandError`](../classes/GitCommandError.md)\>
