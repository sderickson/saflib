# saf-deploy

```
Usage: saf-deploy [options] [command]

Build, push and deploy a SAF product's production stack. Run from the deploy
package (env.remote + remote-assets/).

Options:
  -h, --help         display help for command

Commands:
  build [options]    Build the images remote-assets/docker-compose.prod.yaml
                     runs (and their upstream builds), skipping unchanged ones
                     and reusing registry copies.
  push [options]     Build (if needed) and push the production images to
                     CONTAINER_REGISTRY; images already pushed are only
                     retagged.
  status [options]   Show which production images would be built, pulled from
                     the registry, or are up to date.
  sync               Upload remote-assets/ (compose file, config) to
                     REMOTE_ASSETS_FOLDER_PATH on the server.
  setup              Install Docker on the server if needed and make sure it's
                     running.
  pull               Pull this product's images (those from CONTAINER_REGISTRY
                     in the prod compose file) on the server.
  up                 Start or update the production stack on the server (docker
                     compose up -d --force-recreate).
  down               Stop the production stack on the server.
  logs               Follow the production stack's logs on the server.
  purge              Uninstall Docker from the server.
  exec [file]        Run a shell script on the server with env.remote's values
                     exported (reads the script from [file] or stdin).
  release [options]  Full deploy: push images, sync remote-assets, pull images
                     on the server, and bring the stack up.
  help [command]     display help for command
```

## Subcommands

- [build](./saf-deploy/build.md)
- [push](./saf-deploy/push.md)
- [status](./saf-deploy/status.md)
- [sync](./saf-deploy/sync.md)
- [setup](./saf-deploy/setup.md)
- [pull](./saf-deploy/pull.md)
- [up](./saf-deploy/up.md)
- [down](./saf-deploy/down.md)
- [logs](./saf-deploy/logs.md)
- [purge](./saf-deploy/purge.md)
- [exec](./saf-deploy/exec.md)
- [release](./saf-deploy/release.md)
