# saf-docker skip-rate

```
Usage: saf-docker skip-rate [options] [builds...]

Estimate from git history how often each build would be skipped if images were
only rebuilt when their inputs change.

Arguments:
  builds             build refs or package names (default: all)

Options:
  -n, --commits <n>  number of commits to compare (default: "100")
  --rev <rev>        ref to walk back from (first-parent) (default: "HEAD")
  --json             print machine-readable output
  --no-generate      use the Dockerfiles already on disk
  -h, --help         display help for command
```
