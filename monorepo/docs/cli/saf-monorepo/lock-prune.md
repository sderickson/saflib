# saf-monorepo lock-prune

```
Usage: saf-monorepo lock-prune [options]

Prune stale product lockfile entries and align the product dependency graph
with the embedded saflib platform.

Options:
  --root <dir>  product monorepo root (default: auto-detect)
  -y, --yes     apply fixes without prompting
  --check       report issues and exit without applying fixes
  -h, --help    display help for command
```

## What it checks

- **Redundant product deps** — product packages redeclare registry packages saflib already owns (removed from product `package.json`).
- **Competing product deps** — product semver ranges differ from saflib platform pins (removed from product `package.json`).
- **Hoisting hazards** — peers installed only under `saflib/node_modules` but required by root-hoisted packages (lockfile entry moved to `node_modules/`).
- **Unhoisted registry deps** — registry packages locked under `saflib/*/node_modules/` but missing from the product root (lockfile entry hoisted to `node_modules/`).
- **Lockfile version skew** — product lock resolves a different version than `saflib/package-lock.json` for the same registry package (nested lock entry removed; rerun `npm install`).
- **Platform override drift** — product root `overrides` missing entries from `saflib/package.json` (merged into product root `package.json`).
- **Stale lockfile entries** — workspace paths in `package-lock.json` with no matching `package.json`.

Deploy packages are reported as warnings only. All other product workspaces (including client SPAs) are auto-fixed with `--yes`.

## When to run

Product roots created by `saf-create` run lock-prune automatically:

- `preinstall` on every `npm install` (via the saflib submodule CLI path)
- bootstrap, before the first `npm install`
- `product/init`, before and after product workspaces are added

Manual use:

```bash
npm run lock-prune          # interactive
npm run lock-prune -- -y    # apply fixes
npm run lock-prune -- --check
npm install                 # refresh node_modules after fixes
```
