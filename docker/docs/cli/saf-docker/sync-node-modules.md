# saf-docker sync-node-modules

```
Usage: saf-docker sync-node-modules [options]

Delete named /app/node_modules volumes when their saf-docker install stage hash
changes.

Options:
  -f, --file <path>  Compose file (repeatable; default docker-compose.yaml)
                     (default: [])
  --env-file <path>  Compose env file (repeatable) (default: [])
  --cwd <path>       Working directory for docker compose (default: process cwd)
  -h, --help         display help for command
```
