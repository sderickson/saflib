# saf-imports

```
Usage: saf-imports [options] [command]

Measure and enforce import graphs for SAF monorepo packages

Options:
  -h, --help                      display help for command

Commands:
  measure [options] <entry...>    Walk the static import graph from one or more
                                  entry files and report module counts
  why [options] <entry> <target>  Print the shortest import path from an entry
                                  file to a target module or package
  cycles [options]                Detect circular dependencies in the
                                  first-party import graph
  snapshot                        Generate or check an import-graph metrics
                                  snapshot
  tsconfig                        TypeScript project-reference helpers for
                                  package tsconfig.json files
  spa                             Analyze and measure SPA client route bundles
  help [command]                  display help for command
```

## Subcommands

- [measure](./saf-imports/measure.md)
- [why](./saf-imports/why.md)
- [cycles](./saf-imports/cycles.md)
- [snapshot](./saf-imports/snapshot.md)
- [tsconfig](./saf-imports/tsconfig.md)
- [spa](./saf-imports/spa.md)
