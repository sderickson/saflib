# saf-deploy push

```
Usage: saf-deploy push [options]

Build (if needed) and push the production images to CONTAINER_REGISTRY; images
already pushed are only retagged.

Options:
  --platform <platform>  amd64 (default, for production), native, arm64, or
                         os/arch (default: "amd64")
  --force                rebuild even when an up-to-date image exists
  --concurrency <n>      max concurrent docker builds
  -h, --help             display help for command
```
