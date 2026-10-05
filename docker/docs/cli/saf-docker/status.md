# saf-docker status

```
Usage: saf-docker status [options] [builds...]

Show which images `saf-docker build` would build, pull, or skip (no changes
made).

Arguments:
  builds                 build refs (@pkg/builds/<name>) or package names;
                         default: all builds

Options:
  --dir <path>           also select every build under this directory
                         (repeatable) (default: [])
  --platform <platform>  native (default), amd64, arm64, or os/arch (default:
                         "native")
  --registry <registry>  registry prefix to look for (and push) images, e.g.
                         ghcr.io/org
  -h, --help             display help for command
```
