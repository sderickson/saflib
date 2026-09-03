# TypeScript Projects

SAF monorepos use TypeScript **composite** projects wired together with **project references**. Each workspace package typechecks on its own and emits declarations to `dist/types/`. The root solution (`vue-tsc -b` or `tsc -b`) walks that graph incrementally so edits rebuild only what changed.

## Why

- **Cross-package types** — HTTP handlers, SDK clients, and Vue apps import types from adjacent `*-spec`, `*-db`, and shared lib packages. References tell TypeScript how those packages depend on each other.
- **Incremental typecheck** — After a warm build, `npm run typecheck` at the repo root re-checks only stale projects instead of re-parsing the whole tree.
- **Clear build order** — Upstream packages emit `.d.ts` first; downstream packages consume them. Cycles in the reference graph are errors and must be fixed in the dependency graph.

Declaration output stays in **`dist/types/`** (gitignored). Source trees should not accumulate co-located `.d.ts` / `.d.ts.map` files next to `.ts` sources.

## Layout

- **Package tsconfig** — Each compilable workspace package has a root `tsconfig.json` with `composite: true`, `rootDir: "."`, and `outDir: "./dist/types"`. Vue SPAs may also have `tsconfig.app.json` / `tsconfig.node.json` leaves; references always point at the package root config, not the leaves.
- **Reference graph** — `references` in each package mirror workspace **`dependencies`** (not `devDependencies`). External edges point at another package's root `tsconfig.json`.
- **Solution roots** — The product root `tsconfig.json` references `saflib` and product packages. The `saflib` root references saflib leaf packages for standalone submodule CI. Packages marked with `safImports.compositionRoot` can union extra references for monolith entrypoints.

`saf-imports tsconfig sync` regenerates references from the workspace graph. `saf-imports tsconfig check` fails on drift or cycles (run before typecheck in CI).

## Day-to-day

From the **repo root**:

```bash
npm run typecheck
npm run tsconfig:sync          # after adding packages or changing workspace deps
npm exec saf-imports -- tsconfig check
npm run cleanup-declarations   # remove stale co-located .d.ts artifacts under saflib/
```

From a **single package** (fast inner loop):

```bash
cd saflib/git
npm run typecheck
```

Vue packages use `vue-tsc -b`; backend packages use `tsc -b`.

## When things go wrong

**Reference cycles** — `npm exec saf-imports -- tsconfig cycles`. Fix the workspace dependency graph (merge packages, extract shared types, or remove a spurious dep). Do not drop reference edges to hide cycles.

**Mass `TS6305` ("output file has not been built")** — Usually stale incremental state after deleting `dist/types/`:

```bash
find . -path '*/node_modules/.tmp/*.tsbuildinfo' -delete
npm run typecheck -- --force
```

**Stray declaration files next to source** — Run `npm run cleanup-declarations`, then `npm run tsconfig:sync` so `rootDir` / `outDir` stay correct.

## Authoring types across packages

See [composite type guidance](./03-composite-type-guidance.md) for import and typing conventions under project references.
