# saf-docker sync-node-modules

```
Usage: saf-docker sync-node-modules [options]

Delete named /app/node_modules volumes when their saf-docker install stage hash
changes.
```

Dev compose mounts a named volume over `/app/node_modules` so the host's Darwin
install does not overwrite the image's Linux tree. Those volumes persist across
rebuilds; this command fingerprints `.saf-docker/stage/<image>/` (what `npm ci`
installs) and deletes a volume only when that fingerprint changes so the next
`compose up` re-seeds from the current image.

Skips `/repo/node_modules` (dev-site seeds that with `npm install` on start).

```
Options:
  -f, --file <path>       Compose file (repeatable; default docker-compose.yaml)
  --env-file <path>       Compose env file (repeatable)
  --cwd <path>            Working directory for docker compose
  -h, --help              display help for command
```

Stamps are stored at `<repo>/.saf-docker/node-modules-volume-stamps.json`.
