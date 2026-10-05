# saf-docker build

```
Usage: saf-docker build [options] [builds...]

Build images whose inputs changed (and their upstream builds), skipping any
whose input-tagged image already exists locally or in --registry. Tags
in-<hash>, latest, and build.json tags.

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
  --push                 push images to --registry
  --force                rebuild even when an up-to-date image exists
  --dry-run              only report what would happen (same as `status`)
  --concurrency <n>      max concurrent docker builds (default: "4")
  -h, --help             display help for command
```
