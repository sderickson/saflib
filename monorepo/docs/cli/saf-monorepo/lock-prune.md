# saf-monorepo lock-prune

```
Usage: saf-monorepo lock-prune [options]

Report product/saflib workspace issues in an embedded product repo. --fix
repairs lockfile bookkeeping (stale entries, misplaced hoists); everything else
is reported for you to decide on.

Options:
  --root <dir>  product monorepo root (default: auto-detect)
  --fix         repair the fixable issues
  -y, --yes     same as --fix (kept for existing preinstall hooks)
  -h, --help    display help for command
```
