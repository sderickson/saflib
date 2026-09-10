[**@saflib/git**](../index.md)

---

# Function: readBlobs()

> **readBlobs**(`repoRoot`, `blobHashes`): `ReturnsError`\<`Map`\<`string`, `string`>\>, [`GitCommandError`](../classes/GitCommandError.md)>\>

Read many blobs in one `git cat-file --batch` invocation.
Missing/invalid objects are omitted from the result map (caller treats as miss).

Parses stdout as a Buffer: git's size field is in **bytes**, so decoding
to a UTF-8 string before slicing desyncs on any multi-byte content.

## Parameters

| Parameter    | Type                |
| ------------ | ------------------- |
| `repoRoot`   | `string`            |
| `blobHashes` | readonly `string`[] |

## Returns

`ReturnsError`\<`Map`\<`string`, `string`\>, [`GitCommandError`](../classes/GitCommandError.md)\>
