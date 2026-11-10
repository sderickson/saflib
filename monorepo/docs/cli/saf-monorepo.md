# saf-monorepo

```
Usage: saf-monorepo [options] [command]

npm workspace package conventions and validation for SAF monorepos

Options:
  -h, --help                 display help for command

Commands:
  format <filename>          Format a file with Prettier
  lock-prune [options]       Report product/saflib workspace issues in an
                             embedded product repo. --fix repairs lockfile
                             bookkeeping (stale entries, misplaced hoists,
                             copies nested under workspaces) and re-resolves
                             with npm until clean; everything else is reported
                             for you to decide on.
  renovate-preset [options]  Generate saflib's Renovate presets for product
                             repos (renovate/product.json turns off every
                             package saflib owns). Run from saflib's root;
                             --check fails if they're out of date.
  saflib-bump [options]      In a product repo: move saflib/ to saflib's main
                             (fetched first; never backwards), copy saflib's
                             overrides, re-resolve package-lock.json and run
                             lock-prune --fix. Leaves the changes for you to
                             test and commit.
  help [command]             display help for command
```

## Subcommands

- [format](./saf-monorepo/format.md)
- [lock-prune](./saf-monorepo/lock-prune.md)
- [renovate-preset](./saf-monorepo/renovate-preset.md)
- [saflib-bump](./saf-monorepo/saflib-bump.md)
