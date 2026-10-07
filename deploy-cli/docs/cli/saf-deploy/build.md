# saf-deploy build

```
Usage: saf-deploy build [options]

Build the images remote-assets/docker-compose.prod.yaml runs (and their upstream
builds), skipping unchanged ones and reusing registry copies.

Options:
  --platform <platform>  amd64 (default, for production), native, arm64, or
                         os/arch (default: "amd64")
  --force                rebuild even when an up-to-date image exists
  --concurrency <n>      max concurrent docker builds
  -h, --help             display help for command
```
