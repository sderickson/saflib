# saf-deploy release

```
Usage: saf-deploy release [options]

Full deploy: push images, sync remote-assets, pull images on the server, and
bring the stack up.

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
