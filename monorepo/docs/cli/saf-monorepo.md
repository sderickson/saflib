# saf-monorepo

```
Usage: saf-monorepo [options] [command]

npm workspace package conventions and validation for SAF monorepos

Options:
  -h, --help                 display help for command

Commands:
  exports                    Generate or verify package.json exports maps from
                             directory structure
  side-effects               Scan packages for import-time side effects
  lock-prune [options]       Prune stale product lockfile entries and verify
                             embedded saflib workspace hygiene
  help [command]             display help for command
```

## exports

```
Usage: saf-monorepo exports [options] [command]

Generate or verify package.json exports maps from directory structure

Commands:
  generate [options]         Write heuristic exports map into package.json
  check [options]            Verify committed exports match heuristic generation
```

## side-effects

```
Usage: saf-monorepo side-effects [options] [command]

Scan packages for import-time side effects

Commands:
  scan [options]             Scan one or all workspace packages
```

## lock-prune

```
Usage: saf-monorepo lock-prune [options]

Prune stale product lockfile entries and verify embedded saflib workspace hygiene

Options:
  --root <dir>               product monorepo root (default: auto-detect)
  -y, --yes                  apply fixes without prompting
```

The standalone `saf-lock-prune` bin remains available for scripts that invoke it directly.
