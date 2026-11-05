# saf-deploy up

```
Usage: saf-deploy up [options]

Start or update the production stack on the server (docker compose up -d
--force-recreate), then register its edge routes. Services in
remote-assets/docker-compose.blue-green.yaml deploy blue-green: routes switch to
the new color as soon as it's healthy, and the old color is removed.

Options:
  --local     Run the blue-green deploy and route registration against the local
              Docker, beside a running prod-local stack (the rest of the stack
              is left to prod-local)
  -h, --help  display help for command
```
