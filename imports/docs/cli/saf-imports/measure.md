# saf-imports measure

```
Usage: saf-imports measure [options] <entry...>

Walk the static import graph from one or more entry files and report module
counts

Arguments:
  entry            Entry file path(s) to measure (typically *.test.ts)

Options:
  --json           Machine-readable JSON output
  --include-types  Include type-only imports in the graph
  --verbose        List every first-party file path and external package in the
                   graph
  --root <dir>     Monorepo root (default: auto-detect)
  -h, --help       display help for command
```
