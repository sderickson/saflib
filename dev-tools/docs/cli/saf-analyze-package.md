# saf-analyze-package

```
Usage: saf-analyze-package [options]

Run package layout, LoC, exports, and dead-code checks on the working tree

Options:
  -p, --package <name>  Workspace package name (repeat for multiple) (default:
                        [])
  --match <substring>   Analyze every workspace package whose name includes this
                        substring
  --root <dir>          Monorepo root (default: auto-detect)
  --product-root <dir>  Limit source walk to this repo-relative prefix (e.g.
                        saflib/base)
  --workdir             Analyze the working tree (default; accepted for symmetry
                        with saf-dev-site)
  --no-exports-check    Skip package.json exports heuristic diffs
  -h, --help            display help for command
```
