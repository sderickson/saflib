# saf-monorepo saflib-bump

```
Usage: saf-monorepo saflib-bump [options]

In a product repo: move saflib/ to saflib's main (fetched first; never
backwards), copy saflib's overrides, re-resolve package-lock.json and run
lock-prune --fix. Leaves the changes for you to test and commit.

Options:
  --root <dir>  product monorepo root (default: auto-detect)
  --ref <ref>   saflib ref to move to (default: "origin/main")
  -h, --help    display help for command
```
