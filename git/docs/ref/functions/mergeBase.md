[**@saflib/git**](../index.md)

---

# Function: mergeBase()

> **mergeBase**(`repoRoot`, `a`, `b`): `ReturnsError`\<`string`, [`GitCommandError`](../classes/GitCommandError.md)>\>

Best common ancestor of two commits/refs (`git merge-base <a> <b>`).

## Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `repoRoot` | `string` |
| `a`        | `string` |
| `b`        | `string` |

## Returns

`ReturnsError`\<`string`, [`GitCommandError`](../classes/GitCommandError.md)\>
