# saf-monorepo

```
Usage: saf-monorepo [options] [command]

npm workspace package conventions and validation for SAF monorepos

Options:
  -h, --help            display help for command

Commands:
  format <filename>     Format a file with Prettier
  lock-prune [options]  Prune stale product lockfile entries and verify embedded
                        saflib workspace hygiene.
  side-effects          Scan packages for import-time side effects
  help [command]        display help for command
```

## Subcommands

- [format](./saf-monorepo/format.md)
- [lock-prune](./saf-monorepo/lock-prune.md)
- [side-effects](./saf-monorepo/side-effects.md)
