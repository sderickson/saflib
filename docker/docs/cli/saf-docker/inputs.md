# saf-docker inputs

```
Usage: saf-docker inputs [options] [builds...]

Print each build's inputs and input hash (the image tag it would get). Accepts
build refs (@pkg/builds/<name>) or package names; defaults to all builds.

Arguments:
  builds                 build refs or package names

Options:
  --platform <platform>  target platform, e.g. linux/amd64 (default: "native")
  --json                 print machine-readable output
  -v, --verbose          list every input
  --no-generate          use the Dockerfiles already on disk
  -h, --help             display help for command
```
