[**@saflib/git**](../index.md)

---

# Function: resolveRef()

> **resolveRef**(`repoRoot`, `ref`): `ReturnsError`\<`string`, [`GitCommandError`](../classes/GitCommandError.md)>\>

Resolve a ref (default `HEAD`) to a full commit hash via `git rev-parse`.

## Parameters

| Parameter  | Type     | Default value |
| ---------- | -------- | ------------- |
| `repoRoot` | `string` | `undefined`   |
| `ref`      | `string` | `"HEAD"`      |

## Returns

`ReturnsError`\<`string`, [`GitCommandError`](../classes/GitCommandError.md)\>
