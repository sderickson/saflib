# saf-imports tsconfig

```
Usage: saf-imports tsconfig [options] [command]

TypeScript project-reference helpers for package tsconfig.json files

Options:
  -h, --help                      display help for command

Commands:
  cycles [options]                Detect circular workspace dependencies in the
                                  package-level reference graph
  generate [options]              Generate package and solution tsconfig
                                  references from the workspace dependency graph
  sync [options]                  Write package and solution tsconfig references
                                  (same as generate --write)
  cleanup-declarations [options]  Delete co-located .d.ts / .d.ts.map emit
                                  artifacts outside dist/types
  check [options]                 Fail if on-disk tsconfig references drift from
                                  generated output, or if the graph has cycles
```
