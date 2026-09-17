# product/create

Bootstrap a **new SAF monorepo** in an empty git repository: add the saflib submodule, sync platform `overrides` into the product root, install, then run [`product/init`](./init.md).

Requires **Node.js 26+** (`saf-create` runs TypeScript via `--experimental-strip-types`).

Platform overrides are copied **before** the first `npm install` so optional peers (Vite, Vue compilers, etc.) resolve to saflib pins instead of latest.

## CLI: `saf-create`

Install and run from GitHub (saflib is a monorepo — use curl, not npx subpaths):

```bash
curl -fsSL https://raw.githubusercontent.com/sderickson/saflib/main/product/create/saf-create.sh -o /tmp/saf-create.sh
chmod +x /tmp/saf-create.sh
/tmp/saf-create.sh <name> <domain> --saflib-ref main
```

See the [saf-create CLI reference](../cli/saf-create.md) for options (`--org`, `--saflib-ref`, `--force`).

## Local testing

From a saflib checkout, `product/create/repro-local.sh` creates a throwaway product under `$TMPDIR`, copies your current saflib into `saflib/`, and runs the same bootstrap + init sequence:

```bash
./product/create/repro-local.sh <name> [<domain>]
```

Details and verification steps: [local init testing](../02-local-init-testing.md).
