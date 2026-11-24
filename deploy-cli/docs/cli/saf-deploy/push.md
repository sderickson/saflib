# saf-deploy push

```
Usage: saf-deploy push [options]

Build (if needed) and push the production images to CONTAINER_REGISTRY; images
already pushed are only retagged.

Options:
  --platform <platforms>  amd64, arm64, native, os/arch, or a comma-separated
                          list for multi-arch images (default:
                          SAF_DEPLOY_PLATFORMS from env.remote, else amd64)
  --no-manifest           with several platforms, don't publish multi-arch tags
                          afterwards; with one, push only its input-tagged
                          images (for a per-arch CI job; then run `saf-deploy
                          manifest`)
  --force                 rebuild even when an up-to-date image exists
  --concurrency <n>       max concurrent docker builds
  -h, --help              display help for command
```
