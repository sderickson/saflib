# saf-deploy register-sites

```
Usage: saf-deploy register-sites [options]

Copy remote-assets/caddy/*.Caddyfile into the platform's edge Caddy
(SAF_EDGE_CONTAINER) and reload it. `up` and `release` do this already.

Options:
  --local     Register with the local Docker's edge (prod-local) instead of the
              server's
  -h, --help  display help for command
```
