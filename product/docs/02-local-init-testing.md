# Local init testing

Use this when you change `product/create` (bootstrap) or `product/init` and want to exercise the full path locally without pushing to GitHub or cloning saflib again.

## Requirements

- **Node.js 22+** (product monorepo `engines`; Node 26+ if you use `saf-create` / `run.ts` directly)
- **git** and **npm**
- A local **saflib checkout** (this repo)

## Full bootstrap + init (recommended)

[`product/create/repro-local.sh`](./workflows/create.md#local-testing) creates a throwaway product monorepo under `$TMPDIR` (or `/tmp`), copies your current saflib checkout into `saflib/`, and runs the same bootstrap + `product/init` sequence as [`saf-create`](./workflows/create.md).

```bash
# From the saflib repo root
./product/create/repro-local.sh <name> [<domain>]
```

| Argument   | Default      | Purpose                                 |
| ---------- | ------------ | --------------------------------------- |
| `<name>`   | `testprod`   | Product name (kebab-case)               |
| `<domain>` | `<name>.com` | Product domain passed to `product/init` |

The product directory is:

```bash
export TEST_DIR="${TMPDIR:-/tmp}/saf-bootstrap-test-<name>"
```

**Why `/tmp`?** The repro intentionally lives outside any parent monorepo (for example `saf-2025`). That avoids npm resolving dependencies from a parent `node_modules` during install and test. saflib is **copied** (not symlinked) so CLI scripts resolve modules under the product tree.

Example:

```bash
./product/create/repro-local.sh initdoc initdoc.com
cd "${TMPDIR:-/tmp}/saf-bootstrap-test-initdoc"
```

Bootstrap takes about one to two minutes (two `npm install` passes, lock-prune, and the full `product/init` workflow).

## Verify the result

From the product monorepo root (`$TEST_DIR`):

### 1. Tests

```bash
npm test
```

Expect **26 test files / 64 tests** for a fresh golden product.

If db or http integration tests fail with `Could not locate the bindings file` for **better-sqlite3**, rebuild the native module once (bootstrap runs an initial `npm install --ignore-scripts` before lock-prune):

```bash
npm rebuild better-sqlite3
npm test
```

### 2. Typecheck

```bash
npm run typecheck
```

This runs root `vue-tsc -b` across the product and linked saflib workspaces.

### 3. Client build (optional)

Source the product dev env, then build the Vite client bundle:

```bash
set -a
source <name>/dev/env.dev
set +a
npm run build --workspace=<name>/clients/build
```

Replace `<name>` with your product name (for example `initdoc`).

## Re-run after changes

`repro-local.sh` deletes and recreates `$TEST_DIR` on each run. After editing bootstrap or init logic:

```bash
./product/create/repro-local.sh initdoc initdoc.com
cd "${TMPDIR:-/tmp}/saf-bootstrap-test-initdoc"
npm rebuild better-sqlite3   # if db/http tests fail on bindings
npm test
npm run typecheck
```

## Init only (existing monorepo)

If the repo already has a `saflib/` submodule and root scaffold, run init from the monorepo root:

```bash
npm exec saf-workflow kickoff product/init <name> <domain>
```

See [product/init](./workflows/init.md) for the full checklist. Do **not** use this when saflib is missing — use [`saf-create`](./workflows/create.md) or `repro-local.sh` instead.

### Faster smoke: `--productOnly`

For a quicker check that copies only the golden product tree (skips deploy, scaffold, and kratos steps):

```bash
npm exec saf-workflow kickoff product/init <name> <domain> --productOnly
```

Use this in disposable directories only; it is intended for CI-style smoke tests, not a complete product setup.

## Cleanup

```bash
rm -rf "${TMPDIR:-/tmp}/saf-bootstrap-test-<name>"
```

## Related docs

- [Overview](./01-overview.md) — create vs init
- [saf-create / bootstrap](./workflows/create.md) — production install path
- [product/init](./workflows/init.md) — workflow checklist
