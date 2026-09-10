# Version management

SAF product monorepos combine **your product packages** (`{product}/**`) with the **platform submodule** (`saflib/**`) in one npm workspace. Registry dependencies — Vue, TanStack Query, Vite, MSW, and everything else from npm — are owned by the platform. Products declare `@saflib/*` and `@{org}/*` workspace links; they should not maintain a parallel copy of the platform's third-party dependency graph.

This document explains who owns which versions, how npm installs them, and how [`saf-monorepo lock-prune`](./cli/saf-monorepo/lock-prune.md) keeps product repos aligned with the platform.

## Platform vs product

| Layer            | Examples                                          | Version ownership                                                                                                                                        |
| ---------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform**     | `saflib/vue`, `saflib/sdk`, `saflib/openapi`      | Registry semver ranges in each package's `package.json`; hard pins in `saflib/package.json` `overrides`; resolved versions in `saflib/package-lock.json` |
| **Product**      | `{product}/clients/app`, `{product}/service/http` | `@saflib/*` and `@{org}/{product}-*` workspace deps (`"*"`). Avoid redeclaring registry packages the platform already uses.                              |
| **Product root** | top-level `package.json`                          | Workspace list, shared dev tooling (`vitest`, `vue-tsc`), and **platform overrides synced from saflib**                                                  |

The platform submodule is the contract. When you bump `saflib/`, you adopt whatever registry versions that commit tested against — not a one-time copy made at bootstrap.

## One install root

npm workspaces hoist registry packages to the **product root** `node_modules/`:

```
{product-root}/
├── node_modules/
│   ├── @tanstack/vue-query    ← registry package (hoisted)
│   ├── @saflib/sdk → saflib/sdk   ← workspace symlink
│   └── vue
├── fiddlysticks/**            ← your product workspaces
├── saflib/**                  ← platform workspaces (also symlinked)
├── package.json
└── package-lock.json          ← single lockfile for the whole tree
```

Important implications:

- **`npm install` always runs at the product root**, even when invoked from `{product}/clients/app`. Subdirectory installs still resolve against the outermost workspace root.
- **Workspace symlinks are not npm registry packages.** Adding `"@saflib/sdk": "*"` links to `saflib/sdk`; it does not by itself install `@saflib/sdk`'s registry deps. Those must appear in the root `node_modules/` via the combined workspace dependency graph.
- **`saflib/package-lock.json` is for standalone saflib development.** In a product repo, only the **product root** lockfile matters for installs. The nested lockfile is a reference for platform resolved versions, not a second install target.

## Sources of truth

lock-prune reads three platform sources when aligning a product repo:

### 1. `saflib/**/package.json` dependency fields

Every platform package's `dependencies`, `devDependencies`, and `optionalDependencies` on registry packages form the set of third-party packages the platform uses and the semver ranges it declares.

Product packages should **not** redeclare these unless they introduce a dependency the platform does not use at all.

### 2. `saflib/package.json` `overrides`

Hard pins npm must enforce across the whole tree — versions npm cannot reliably dedupe with ranges alone:

```json
"overrides": {
  "vue": "3.5.20",
  "vite": "8.0.13",
  "rolldown": "1.0.1",
  "msw": "2.12.7",
  "vue-router": "^5.0.0",
  "vuetify": "^4.1.6",
  "better-sqlite3": "12.11.1",
  "@types/node": "^24.3.0"
}
```

`overrides` in a workspace member's `package.json` **do not apply** to the product root install. lock-prune **syncs** platform overrides into the product root `package.json` on each run so the product tree actually uses the same pins.

### 3. `saflib/package-lock.json` resolved versions

When the platform lock resolves `@tanstack/vue-query` to `5.85.9` but the product lock has `5.102.8` nested under `saflib/sdk/node_modules/`, that is **version skew**. lock-prune removes the stale nested entry so the next `npm install` resolves to the platform version.

## What product packages should declare

**Declare:**

- `@saflib/*` workspace packages your code imports
- `@{org}/{product}-*` workspace packages (your product's own packages)
- Registry packages **unique to your product** that no platform package uses

**Do not declare** (platform already owns them):

- `vue`, `vue-router`, `vuetify`, `@tanstack/vue-query`
- `@vue/tsconfig`, `vite-plugin-vuetify`, `msw`, `http-errors`
- Other registry deps already present in the saflib dependency graph

Golden product templates under `saflib/base/` follow this rule. If `product/init` copies a redundant declaration, lock-prune removes it.

Use `@saflib/vue`, `@saflib/sdk`, `@saflib/vite`, `@saflib/vitepress`, and similar workspace entry points — not the underlying registry packages those packages wrap.

## lock-prune

[`saf-monorepo lock-prune`](./cli/saf-monorepo/lock-prune.md) is the enforcement tool. It detects and fixes:

| Issue                                                          | Fix                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| Redundant product dep                                          | Remove from product `package.json`                      |
| Competing product dep (wrong semver vs platform)               | Remove from product `package.json`                      |
| Hoisting hazard (peer only under `saflib/node_modules`)        | Move lockfile entry to root `node_modules/`             |
| Unhoisted registry dep (locked under `saflib/*/node_modules/`) | Hoist lockfile entry to root `node_modules/`            |
| Nested lockfile version skew vs `saflib/package-lock.json`     | Remove nested lock entry; rerun `npm install`           |
| Root lockfile version skew (exact override pins only, advisory) | Warn only — do not rewrite the product lock; rely on overrides + `npm install`. Caret/tilde ranges are ignored. |
| Platform override drift                                        | Merge `saflib/package.json` overrides into product root |
| Stale lockfile workspace paths                                 | Remove dead entries from `package-lock.json`            |

After lock-prune modifies `package.json` or `package-lock.json`, run **`npm install` at the product root** to refresh `node_modules/`.

### Automatic runs

Product repos created with [`saf-create`](../../product/docs/01-overview.md) run lock-prune:

1. **`preinstall`** on every `npm install` (via the saflib submodule CLI path — no prior install required)
2. **Bootstrap**, before the first `npm install`
3. **`product/init`**, before and after product workspaces are added

### Manual use

```bash
npm run lock-prune              # interactive
npm run lock-prune -- -y        # apply fixes
npm run lock-prune -- --check   # CI: report issues, exit non-zero
npm install                     # refresh node_modules after fixes
```

Deploy workspaces are reported as warnings only; all other product workspaces (including client SPAs) are auto-fixed with `--yes`.

## Common failure: missing transitive deps

Symptom: TypeScript reports `Cannot find module '@tanstack/vue-query'` (or similar) from a file under `saflib/`, even though `@saflib/sdk` lists it as a dependency.

Typical causes:

1. **Product lockfile has nested entries** (`saflib/sdk/node_modules/foo`) that npm never materializes on disk in a hoisted install.
2. **Version skew** caused npm to skip installing a package during peer resolution.
3. **Product packages compete with platform semver**, pulling a different resolution than saflib tested.

Fix:

```bash
npm run lock-prune -- -y
npm install
```

Do not add root anchor deps, `legacy-peer-deps`, or duplicate registry declarations on product packages — align the graph instead.

## Updating the platform

When you bump the `saflib/` submodule:

1. Pull or checkout the new submodule commit.
2. Run `npm run lock-prune -- -y` at the product root.
3. Run `npm install`.
4. Run `npm run typecheck` and fix any product code breaks from intentional platform changes.

lock-prune re-syncs overrides and prunes skewed lock entries against the **current** submodule — you do not need to re-bootstrap or hand-copy platform config.

## Design principles

1. **Platform owns registry versions.** Products own workspace wiring and product-specific packages.
2. **One lockfile, one `node_modules` root.** No nested install roots inside `saflib/` in product repos.
3. **Align, don't override locally.** Prefer lock-prune + platform pins over per-product `.npmrc` workarounds.
4. **Declare what you import from npm directly.** Inside saflib, packages that import a registry module should list it in their own `package.json`. Products should reach registry code through `@saflib/*` workspace packages instead.
5. **Ongoing sync, not copy-once.** Bootstrap and init kick off alignment; `preinstall` keeps it current as saflib moves.

## Related docs

- [Overview](./01-overview.md) — workspace layout and package conventions
- [lock-prune CLI](./cli/saf-monorepo/lock-prune.md) — flags and issue types
- [product/init](../../product/docs/workflows/init.md) — scaffolding a new product
- [saf-create / bootstrap](../../product/docs/01-overview.md) — new monorepo setup
