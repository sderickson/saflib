**@saflib/git**

---

# @saflib/git

## Classes

| Class                                         | Description                                                                                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [GitCommandError](classes/GitCommandError.md) | Raised when a git plumbing command exits non-zero or produces unparseable output. Consumers should treat this as an expected, typed failure (missing ref, corrupt object, not a git repo, etc.) rather than an unexpected exception. |

## Interfaces

| Interface                                  | Description                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| [GitCommit](interfaces/GitCommit.md)       | One commit returned by [log](functions/log.md).                            |
| [GitRef](interfaces/GitRef.md)             | -                                                                          |
| [GitTreeEntry](interfaces/GitTreeEntry.md) | One tree entry returned by [listTree](functions/listTree.md) (blobs only). |
| [LogOptions](interfaces/LogOptions.md)     | -                                                                          |

## Functions

| Function                                    | Description                                                                                                                                                                                          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [currentBranch](functions/currentBranch.md) | Short name of the branch HEAD points at (e.g. `main`), or `null` when detached.                                                                                                                      |
| [isAncestor](functions/isAncestor.md)       | True when `maybeAncestor` is an ancestor of `maybeDescendant` (or they are the same commit). Wraps `git merge-base --is-ancestor`.                                                                   |
| [listRefs](functions/listRefs.md)           | List local branch and tag refs via `git for-each-ref`. Does not include remote-tracking refs.                                                                                                        |
| [listRenames](functions/listRenames.md)     | File rename pairs from `fromRef` to `toRef` (`git diff --find-renames -z --name-status --diff-filter=R`).                                                                                            |
| [listTree](functions/listTree.md)           | List every blob at `commitHash` (recursive) without checking anything out. Directories / trees / commits / tags are skipped — only `blob` entries are returned. Paths are relative to the repo root. |
| [log](functions/log.md)                     | Walk commits on `ref` (default `HEAD`), newest first — same order as `git log`. Uses `--first-parent` so merge commits don't fan the walk out.                                                       |
| [mergeBase](functions/mergeBase.md)         | Best common ancestor of two commits/refs (`git merge-base <a> <b>`).                                                                                                                                 |
| [readBlob](functions/readBlob.md)           | Read a blob's contents by hash without checking anything out. Returns the raw file text (git stores blobs without a trailing newline of its own beyond what the file itself contained).              |
| [readBlobs](functions/readBlobs.md)         | Read many blobs in one `git cat-file --batch` invocation. Missing/invalid objects are omitted from the result map (caller treats as miss).                                                           |
| [resolveRef](functions/resolveRef.md)       | Resolve a ref (default `HEAD`) to a full commit hash via `git rev-parse`.                                                                                                                            |
