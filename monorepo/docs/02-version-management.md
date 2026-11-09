# Version management

SAF product monorepos combine **your product packages** (`{product}/**`) with the **platform submodule** (`saflib/**`) in one npm workspace with one lockfile. The goal is that every package, product or platform, resolves each registry dependency (Vue, TanStack Query, Vite, MSW, …) to **one copy at the root**.

This document explains who sets which versions, how npm installs them, and the two tools that check the result: the [dependency alignment check](#dependency-alignment-check), which fails when a package would be installed twice, and [`saf-monorepo lock-prune`](./cli/saf-monorepo/lock-prune.md), which reports drift from the platform.

## Platform vs product

| Layer            | Examples                                          | Version ownership                                                                                                                                         |
| ---------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform**     | `saflib/vue`, `saflib/sdk`, `saflib/openapi`      | Registry semver ranges in each package's `package.json`; hard pins in `saflib/package.json` `overrides`; resolved versions in `saflib/package-lock.json`  |
| **Product**      | `{product}/clients/app`, `{product}/service/http` | `@saflib/*` and `@{org}/{product}-*` workspace deps (`"*"`), plus every registry package the package imports, with a range compatible with the platform's |
| **Product root** | top-level `package.json`                          | Workspace list, shared dev tooling (`vitest`, `vue-tsc`), and `overrides` (copied from saflib's at bootstrap and on every saflib bump)                      |

The platform submodule sets the versions saflib was tested against. saflib is the source of truth for every package it declares: products follow its versions and copy its overrides when they bump the submodule (see [Dependency updates](./03-dependency-updates.md)). A product chooses versions only for packages saflib doesn't use.

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

lock-prune compares a product repo against three platform sources:

### 1. `saflib/**/package.json` dependency fields

Every platform package's `dependencies`, `devDependencies`, and `optionalDependencies` on registry packages form the set of third-party packages the platform uses and the semver ranges it declares.

A product package that imports one of these declares it too, with a range that overlaps the platform's.

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

`overrides` in a workspace member's `package.json` **do not apply** to the product root install. Bootstrap copies saflib's overrides into a new product root, and each saflib bump copies them again. lock-prune reports where they differ from saflib's; a product keeps a difference only for a reason worth writing down.

### 3. `saflib/package-lock.json` resolved versions

When the platform lock resolves `@tanstack/vue-query` to `5.85.9` but the product lock has `5.102.8` nested under `saflib/sdk/node_modules/`, that is **version skew**, and lock-prune reports it. The nested copy also fails the dependency alignment check.

## What product packages should declare

Each package declares what it imports:

- `@saflib/*` workspace packages
- `@{org}/{product}-*` workspace packages (your product's own packages)
- Registry packages it imports directly, even when a platform package also uses them

Declaring what you import matters beyond style: a production Docker build stages only the image's own packages and their declared dependencies, so a package that relies on some other workspace package declaring its dependency builds locally and fails in the image.

Prefer `@saflib/vue`, `@saflib/sdk`, `@saflib/vite`, `@saflib/vitepress`, and similar workspace entry points where they cover what you need.

## Dependency alignment check

`saflib/docker/dev/check-dependency-alignment.ts` fails if the lockfile installs any package below a workspace directory instead of once at the root, and shows which packages want which versions:

```bash
node --experimental-strip-types saflib/docker/dev/check-dependency-alignment.ts
```

It runs before every dev-stack install (the `deps` service) and at the end of `product/init`. To fix a report, align the version ranges or add an `overrides` entry in the product root `package.json`, then `npm install`. A copy at the root's own version only comes from editing the lockfile; delete those entries and reinstall.

## lock-prune

[`saf-monorepo lock-prune`](./cli/saf-monorepo/lock-prune.md) reports product/platform drift, including everything the dependency alignment check reports, and exits non-zero when it finds any. It changes nothing unless you pass `--fix`, and even then only repairs lockfile bookkeeping:

| Issue                                                        | With `--fix`                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Stale lockfile workspace paths                               | Removes dead entries from `package-lock.json`                                                 |
| Hoisting hazard (peer only under `saflib/node_modules`)      | Moves the lockfile entry to root `node_modules/`                                              |
| Unhoisted registry dep (locked only under a saflib path)     | Hoists the lockfile entry to root `node_modules/`                                             |
| Workspace duplicate (root's version again under a workspace) | Removes the nested copy                                                                       |
| Workspace misalignment (other version under a workspace)     | Removes the nested and root copies for npm to re-resolve; reported if npm recreates the split |
| Competing product dep (range that doesn't overlap saflib's)  | Reported only                                                                                 |
| Nested lockfile version skew vs platform                     | Reported only                                                                                 |
| Override drift vs `saflib/package.json`                      | Reported only                                                                                 |

`--fix` repeats until nothing fixable is left (up to five passes): apply the fixes, `npm install --package-lock-only --ignore-scripts`, check again. A misalignment that survives a clean re-resolve is a genuine range conflict. Afterwards, run **`npm install` at the product root** to refresh `node_modules/`.

Nothing runs lock-prune automatically. Earlier product repos may still have a `preinstall` hook that runs `saflib/monorepo/bin/lock-prune-run.ts --yes`; inside an npm install it makes a single pass without calling npm, and the hook can be removed.

Implementation lives under `saflib/monorepo/src/lock-prune/`.

## Updating the platform

[Dependency updates](./03-dependency-updates.md) is the runbook: how saflib's Renovate PRs merge themselves, and the steps for bumping saflib in a product (copy overrides, re-resolve, `lock-prune --fix`, verify).

## Design principles

1. **One lockfile, one `node_modules` root, one copy of each package.** No nested install roots inside `saflib/` in product repos.
2. **saflib sets versions; products follow.** saflib's ranges, overrides and lockfile are what products adopt; products pick versions only for packages saflib doesn't use.
3. **Declare what you import.** Every package, product or platform, lists the registry packages it imports, so each Docker image's staged install is complete.
4. **Check, don't rewrite.** Tools report misalignment and leave version decisions to people; automatic fixes are limited to lockfile bookkeeping.

## Related docs

- [Overview](./01-overview.md) — workspace layout and package conventions
- [Dependency updates](./03-dependency-updates.md) — the update runbook
- [lock-prune CLI](./cli/saf-monorepo/lock-prune.md) — flags
- [product/init](../../product/docs/workflows/init.md) — scaffolding a new product
- [saf-create / bootstrap](../../product/docs/01-overview.md) — new monorepo setup
