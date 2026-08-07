# saf-imports

```
Usage: saf-imports [options] [command]

Measure and enforce import-graph budgets for SAF monorepo packages

Options:
  -h, --help                      display help for command

Commands:
  measure [options] <entry...>    Walk the static import graph from one or more
                                  entry files and report module counts
  why [options] <entry> <target>  Print the shortest import path from an entry
                                  file to a target module or package
  cycles [options]                Detect circular dependencies in the
                                  first-party import graph
  help [command]                  display help for command

```
