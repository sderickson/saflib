[**@saflib/git**](../index.md)

---

# Function: listRefs()

> **listRefs**(`repoRoot`): `ReturnsError`\<[`GitRef`](../interfaces/GitRef.md)[], [`GitCommandError`](../classes/GitCommandError.md)>\>

List local branch and tag refs via `git for-each-ref`.
Does not include remote-tracking refs.

## Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `repoRoot` | `string` |

## Returns

`ReturnsError`\<[`GitRef`](../interfaces/GitRef.md)[], [`GitCommandError`](../classes/GitCommandError.md)\>
