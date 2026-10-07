# saf-docker

```
Usage: saf-docker [options] [command]

Helps manage Docker-related files in SAF packages.

Options:
  -h, --help                       display help for command

Commands:
  prune                            Free unused Docker build cache before image
                                   builds (avoids ENOSPC during npm ci).
  generate                         Generate all Dockerfiles from templates
                                   across the monorepo.
  sync-node-modules [options]      Delete named /app/node_modules volumes when
                                   their saf-docker install stage hash changes.
  inputs [options] [builds...]     Print each build's inputs and input hash (the
                                   image tag it would get). Accepts build refs
                                   (@pkg/builds/<name>) or package names;
                                   defaults to all builds.
  skip-rate [options] [builds...]  Estimate from git history how often each
                                   build would be skipped if images were only
                                   rebuilt when their inputs change.
  build [options] [builds...]      Build images whose inputs changed (and their
                                   upstream builds), skipping any whose
                                   input-tagged image already exists locally or
                                   in --registry. Tags in-<hash>, latest, and
                                   build.json tags.
  status [options] [builds...]     Show which images `saf-docker build` would
                                   build, pull, or skip (no changes made).
  help [command]                   display help for command
```

## Subcommands

- [prune](./saf-docker/prune.md)
- [generate](./saf-docker/generate.md)
- [sync-node-modules](./saf-docker/sync-node-modules.md)
- [inputs](./saf-docker/inputs.md)
- [skip-rate](./saf-docker/skip-rate.md)
- [build](./saf-docker/build.md)
- [status](./saf-docker/status.md)
