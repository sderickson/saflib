# saf-imports why

```
Usage: saf-imports why [options] <entry> <target>

Print the shortest import path from an entry file to a target module or package

Arguments:
  entry            Entry file path (typically a *.test.ts)
  target           Workspace file, workspace package name, or external root
                   (e.g. stripe)

Options:
  --include-types  Include type-only imports in the graph
  --root <dir>     Monorepo root (default: auto-detect)
  -h, --help       display help for command
```
