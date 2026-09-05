[**@saflib/git**](../index.md)

---

# Function: isAncestor()

> **isAncestor**(`repoRoot`, `maybeAncestor`, `maybeDescendant`): `ReturnsError`\<`boolean`, [`GitCommandError`](../classes/GitCommandError.md)>\>

True when `maybeAncestor` is an ancestor of `maybeDescendant` (or they are
the same commit). Wraps `git merge-base --is-ancestor`.

## Parameters

| Parameter         | Type     |
| ----------------- | -------- |
| `repoRoot`        | `string` |
| `maybeAncestor`   | `string` |
| `maybeDescendant` | `string` |

## Returns

`ReturnsError`\<`boolean`, [`GitCommandError`](../classes/GitCommandError.md)\>
