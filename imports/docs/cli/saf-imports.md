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
  snapshot [options]              Generate or diff import-graph metric snapshots
  tsconfig [options]              Sync, check, or repair TypeScript project
                                  references
  spa [options]                   Analyze SPA bundle import graphs
  help [command]                  display help for command

```

For export coverage validation, use [saf-analyze-package](../../../dev-tools/docs/package-issues.md).
