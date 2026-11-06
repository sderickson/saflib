# saf-deploy rollback

```
Usage: saf-deploy rollback [options]

Run the blue-green services' previous images again (recorded by the last
successful `up`), with the same health gate as a deploy. The rest of the stack
is left alone.

Options:
  --local     Roll back on the local Docker (beside prod-local) instead of the
              server
  -h, --help  display help for command
```
