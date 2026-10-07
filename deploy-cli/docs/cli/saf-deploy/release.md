# saf-deploy release

```
Usage: saf-deploy release [options]

Full deploy: push images, sync remote-assets, pull images on the server, and
bring the stack up.

Options:
  --platform <platform>  amd64 (default, for production), native, arm64, or
                         os/arch (default: "amd64")
  --force                rebuild even when an up-to-date image exists
  --concurrency <n>      max concurrent docker builds
  -h, --help             display help for command
```
