# product/create (saf-create)

## Source

[`product/bin/saf-create/index.ts`](https://github.com/sderickson/saflib/blob/main/product/bin/saf-create/index.ts)

## Usage

From an empty git repository:

```bash
npx --yes github:sderickson/saflib/saflib/product/create#main -- <name> <domain>
```

Pin a saflib release:

```bash
npx --yes github:sderickson/saflib/saflib/product/create#v2026.09.02 -- my-app example.com --saflib-ref v2026.09.02
```

## What it does

1. Verifies the directory is a git repository.
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
| `--saflib-repo <url>` | Git URL for the submodule (default: `https://github.com/sderickson/saflib.git`) |
| `--saflib-ref <ref>` | Branch, tag, or commit in saflib after submodule add (default: `main`) |
| `--force` | Continue when bootstrap paths already exist |
| `--product-only` | Forward `--productOnly` to `product/init` |

## Help

```bash
npx --yes github:sderickson/saflib/saflib/product/create#main -- --help
```
