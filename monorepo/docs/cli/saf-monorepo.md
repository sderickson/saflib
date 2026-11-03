# saf-monorepo

```
Usage: saf-monorepo [options] [command]

npm workspace package conventions and validation for SAF monorepos

Options:
  -h, --help            display help for command

Commands:
  format <filename>     Format a file with Prettier
  lock-prune [options]  Report product/saflib workspace issues in an embedded
                        product repo. --fix repairs lockfile bookkeeping (stale
                        entries, misplaced hoists); everything else is reported
                        for you to decide on.
  help [command]        display help for command
```

## Subcommands

- [format](./saf-monorepo/format.md)
- [lock-prune](./saf-monorepo/lock-prune.md)
