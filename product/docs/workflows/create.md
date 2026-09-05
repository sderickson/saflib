# product/create (saf-create)

## Source

[`product/create/`](https://github.com/sderickson/saflib/tree/main/product/create)

## Requirements

- **Node.js 26+** — the CLI runs TypeScript directly via [`--experimental-strip-types`](https://nodejs.org/docs/latest-v26.x/api/cli.html#--experimental-strip-types) (no esbuild bundle).

## Usage

saflib is a workspace monorepo — **npm/npx cannot install `product/create` as a subpath** (it pulls the whole tree and fails). Download and run the install script instead:

```bash
curl -fsSL https://raw.githubusercontent.com/sderickson/saflib/main/product/create/saf-create.sh -o /tmp/saf-create.sh
chmod +x /tmp/saf-create.sh
/tmp/saf-create.sh <name> <domain> --saflib-ref main
```

Pin a branch or tag for both the script sources and the submodule:

```bash
REF=2026-09-02-doc-updates
curl -fsSL "https://raw.githubusercontent.com/sderickson/saflib/${REF}/product/create/saf-create.sh" -o /tmp/saf-create.sh
chmod +x /tmp/saf-create.sh
/tmp/saf-create.sh my-app example.com --saflib-ref "${REF}"
```

`--saflib-ref` also selects which GitHub ref to download the TypeScript sources from. Set `SAFLIB_CREATE_REF` when the download ref and submodule ref differ.

Local saflib checkout (`run.ts` has a shebang with `--experimental-strip-types`):

```bash
./saflib/product/create/run.ts my-app example.com --saflib-ref HEAD
```

## What it does

1. Verifies the directory is a git repository (creates an empty initial commit if needed).
2. Exits if a `saflib` submodule is already configured (use [`product/init`](./init.md) instead).
3. Warns when `<name>/`, `deploy/`, or `.github/` already exist (pass `--force` to continue).
4. Creates or updates root `package.json` with `"workspaces": ["saflib/**", …]`.
5. Runs `git submodule add` for saflib and checks out `--saflib-ref`.
6. Runs `npm install`.
7. Runs `npm exec saf-workflow kickoff product/init <name> <domain>`.

## Options

| Flag | Purpose |
| --- | --- |
| `--org <name>` | npm scope for `@org/<product>` packages (default: product name) |
| `--saflib-ref <ref>` | Branch, tag, or commit in saflib after submodule add (default: `main`) |
| `--force` | Continue when bootstrap paths already exist |

The install script uses `SAFLIB_CREATE_REF` (if set), else `--saflib-ref`, else `main` to choose which GitHub ref downloads TypeScript sources.

## Help

```bash
/tmp/saf-create.sh --help
```
