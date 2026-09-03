[**@saflib/git**](../index.md)

---

# Function: readBlob()

> **readBlob**(`repoRoot`, `blobHash`): `ReturnsError`\<`string`, [`GitCommandError`](../classes/GitCommandError.md)>\>

Read a blob's contents by hash without checking anything out.
Returns the raw file text (git stores blobs without a trailing newline of its
own beyond what the file itself contained).

## Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `repoRoot` | `string` |
| `blobHash` | `string` |

## Returns

`ReturnsError`\<`string`, [`GitCommandError`](../classes/GitCommandError.md)\>
