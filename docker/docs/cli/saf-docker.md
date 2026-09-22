# saf-docker

```
Usage: saf-docker [options] [command]

Helps manage Docker-related files in SAF packages.

Options:
  -h, --help      display help for command

Commands:
  prune               Free unused Docker build cache before image builds (avoids
                      ENOSPC during npm ci).
  generate            Generate all Dockerfiles from templates across the monorepo.
  sync-node-modules   Delete named /app/node_modules volumes when their
                      saf-docker install stage hash changes.
  help [command]      display help for command
```

## Subcommands

- [prune](./saf-docker/prune.md)
- [generate](./saf-docker/generate.md)
- [sync-node-modules](./saf-docker/sync-node-modules.md)
