# Version management

SAF product monorepos combine **your product packages** (`{product}/**`) with the **platform submodule** (`saflib/**`) in one npm workspace with one lockfile. The goal is that every package, product or platform, resolves each registry dependency (Vue, TanStack Query, Vite, MSW, …) to **one copy at the root**.

This document explains who sets which versions, how npm installs them, and the two tools that check the result: the [dependency alignment check](#dependency-alignment-check), which fails when a package would be installed twice, and [`saf-monorepo lock-prune`](./cli/saf-monorepo/lock-prune.md), which reports drift from the platform.

## Platform vs product

| Layer            | Examples                                          | Version ownership                                                                                                                                        |
| ---------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform**     | `saflib/vue`, `saflib/sdk`, `saflib/openapi`      | Registry semver ranges in each package's `package.json`; hard pins in `saflib/package.json` `overrides`; resolved versions in `saflib/package-lock.json` |
| **Product**      | `{product}/clients/app`, `{product}/service/http` | `@saflib/*` and `@{org}/{product}-*` workspace deps (`"*"`), plus every registry package the package imports, with a range compatible with the platform's |
| **Product root** | top-level `package.json`                          | Workspace list, shared dev tooling (`vitest`, `vue-tsc`), and `overrides` (seeded from saflib's at bootstrap; the product's to change)                    |

The platform submodule sets the versions saflib was tested against. A product should stay compatible with them (ranges that overlap, so npm can install one copy), but the product root decides its own pins.

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

`overrides` in a workspace member's `package.json` **do not apply** to the product root install. Bootstrap copies saflib's overrides into a new product root; after that they're the product's. lock-prune reports where they differ from saflib's, so you can decide whether to follow.

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

[`saf-monorepo lock-prune`](./cli/saf-monorepo/lock-prune.md) reports product/platform drift and exits non-zero when it finds any. It changes nothing unless you pass `--fix`, and even then only repairs lockfile bookkeeping:

| Issue                                                     | With `--fix`                                 |
| --------------------------------------------------------- | -------------------------------------------- |
| Stale lockfile workspace paths                            | Removes dead entries from `package-lock.json` |
| Hoisting hazard (peer only under `saflib/node_modules`)   | Moves the lockfile entry to root `node_modules/` |
| Unhoisted registry dep (locked only under a saflib path)  | Hoists the lockfile entry to root `node_modules/` |
| Competing product dep (range that doesn't overlap saflib's) | Reported only                              |
| Nested lockfile version skew vs platform                  | Reported only                                |
| Override drift vs `saflib/package.json`                   | Reported only                                |

After `--fix`, run **`npm install` at the product root** to refresh `node_modules/`.

Nothing runs lock-prune automatically. Earlier product repos may still have a `preinstall` hook that runs `saflib/monorepo/bin/lock-prune-run.ts --yes`; that now applies only the fixes above, and the hook can be removed.

Implementation lives under `saflib/monorepo/src/lock-prune/`.

## Updating the platform

When you bump the `saflib/` submodule:

1. Pull or checkout the new submodule commit.
2. Run `npm install` at the product root.
3. Run the dependency alignment check, and `npm exec saf-monorepo -- lock-prune` to see where the product differs from the new platform versions.
4. Run `npm run typecheck` and fix any product code breaks from intentional platform changes.

## Design principles

1. **One lockfile, one `node_modules` root, one copy of each package.** No nested install roots inside `saflib/` in product repos.
2. **Platform sets tested versions; products stay compatible.** Products choose their own pins and overrides, within ranges npm can share with the platform.
3. **Declare what you import.** Every package, product or platform, lists the registry packages it imports, so each Docker image's staged install is complete.
4. **Check, don't rewrite.** Tools report misalignment and leave version decisions to people; automatic fixes are limited to lockfile bookkeeping.

## Related docs

- [Overview](./01-overview.md) — workspace layout and package conventions
- [lock-prune CLI](./cli/saf-monorepo/lock-prune.md) — flags
- [product/init](../../product/docs/workflows/init.md) — scaffolding a new product
- [saf-create / bootstrap](../../product/docs/01-overview.md) — new monorepo setup
