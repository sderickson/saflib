# saf-deploy manifest

```
Usage: saf-deploy manifest [options]

Point the production images' latest (and build.json) tags at multi-arch manifest
lists of each platform's pushed image. Run after per-platform `push
--no-manifest` jobs.

Options:
  --platform <platforms>  comma-separated platforms to combine (default:
                          SAF_DEPLOY_PLATFORMS from env.remote, else amd64)
  --dry-run               check every platform's image exists; publish nothing
  -h, --help              display help for command
```
