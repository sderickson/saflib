# saf-deploy migrate

```
Usage: saf-deploy migrate [options]

Walk through moving the whole stack (every deploy on the host) to a new machine:
create it, connect, mount its data disk, set it up, stage, then in a short
window stop the old stack, copy the data, move the address and start the new
one. Resumable; run from the monorepo root.

Options:
  --deploys <dirs>          comma-separated deploy package directories on the
                            host, platform deploy first
  --to <target>             name for the new machine's target
                            (env.remote.<target>), e.g. next
  --from <target>           target the stack moves from (default: env.remote
                            alone)
  --previous-name <target>  target name the old machine's values are kept under
                            once the new one is the default (default:
                            "previous")
  --restart                 forget saved progress and start from step 1
  -h, --help                display help for command
```
