[**@saflib/git**](../index.md)

---

# Interface: LogOptions

## Properties

### limit?

> `optional` **limit**: `number`

Max commits to return (`-n`).

---

### ref?

> `optional` **ref**: `string`

Ref to walk (branch name, tag, or commit hash). Defaults to `"HEAD"`.
Walked with `--first-parent` so merge commits don't fan out.

---

### since?

> `optional` **since**: `string`

Exclusive lower bound as a commit hash: walks `since..ref` (commits reachable
from `ref` but not from `since`). This is a hash cursor, not git's date-based
`--since` flag — matching the "ingest commits since the last recorded one"
scan use case.
