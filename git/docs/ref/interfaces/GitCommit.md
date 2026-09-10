[**@saflib/git**](../index.md)

---

# Interface: GitCommit

One commit returned by [log](../functions/log.md).

## Properties

### authoredAt

> **authoredAt**: `string`

Author date as an ISO-8601 string (`%aI`).

---

### hash

> **hash**: `string`

Full 40-char commit object hash.

---

### parentHashes

> **parentHashes**: `string`[]

Parent commit hashes (empty for the root commit).

---

### subject

> **subject**: `string`

First line of the commit message (`%s`).
