[**@saflib/git**](../index.md)

---

# Function: log()

> **log**(`repoRoot`, `options`): `ReturnsError`\<[`GitCommit`](../interfaces/GitCommit.md)[], [`GitCommandError`](../classes/GitCommandError.md)>\>

Walk commits on `ref` (default `HEAD`), newest first — same order as
`git log`. Uses `--first-parent` so merge commits don't fan the walk out.

Field format is controlled here so callers never parse raw git pretty-format
strings themselves.

## Parameters

| Parameter  | Type                                        |
| ---------- | ------------------------------------------- |
| `repoRoot` | `string`                                    |
| `options`  | [`LogOptions`](../interfaces/LogOptions.md) |

## Returns

`ReturnsError`\<[`GitCommit`](../interfaces/GitCommit.md)[], [`GitCommandError`](../classes/GitCommandError.md)\>
