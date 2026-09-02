# Composite projects: type and import guidance

Conventions for writing TypeScript in SAF monorepos that use **composite** project
references (`composite: true`, `emitDeclarationOnly`, per-package `dist/types/`).

This complements [03-project-references.md](./03-project-references.md) (tooling and
dev loop). It is aimed at humans and agents authoring or refactoring types across
workspace packages.

## What composite changes

Composite builds enforce **package boundaries**:

- Each workspace package is its own TypeScript project.
- Cross-package imports must go through **`package.json` exports**, not relative
  paths into a neighbor's source tree.
- Declaration files emit to **`dist/types/`** per package (gitignored), not next to
  sources.

Types are not automatically _simpler_ in every file, but they are **more
contained**: coupling is explicit in workspace deps and `references`, and
incremental typecheck only rebuilds what changed.

## Package boundaries

### Do

- Import across packages via **published export paths**:
  `@org/product-sdk`, `@org/product-spec`, `@saflib/vue`, etc.
- Add or update `package.json` `exports` when exposing a new entry point, then run
  `saf-imports tsconfig generate --write`.
- Break **workspace dependency cycles** by restructuring deps (merge packages,
  extract shared types to a lower layer, move helpers to a leaf library).
- Keep shared null/empty/fixture helpers in **low-level spec or util packages** so
  higher layers do not import each other in a circle.

### Don't

- Use relative imports that cross package roots (`../../../other-package/src/...`).
  They pull source into the wrong compilation unit and cause `TS6059` / `TS6307`.
- "Fix" a type error by adding a cross-package relative import.
- Omit a `references` edge to hide a cycle — `saf-imports tsconfig check` fails
  CI when the graph is inconsistent or cyclic.

## tsconfig and presets

### Do

- Put **`outDir`**, **`include`**, **`references`**, and **`tsBuildInfoFile`** in
  the **consuming package's** tsconfig leaf, not in shared `extends` presets.
- Extend **`@saflib/monorepo/tsconfig.json`** (backend) or
  **`@saflib/vue/tsconfig.app.json`** (Vue app leaf preset) from each package.
- Emit declarations only to **`./dist/types`** with
  `emitDeclarationOnly: true` and `noEmit: false` on the package leaf.
- Keep hand-authored ambient modules as exceptions: `assets.d.ts`,
  `vitest-config.d.ts`, etc. (listed in `.gitignore` exceptions).
- After deleting `dist/types/`, clear `node_modules/.tmp/*.tsbuildinfo` or run
  `tsc -b --force` / `vue-tsc -b --force` to avoid stale `TS6305` skips.

### Don't

- Put **`outDir`** or package-specific **`include`** / **`references`** in
  `tsconfig.base.json`, `tsconfig.app.base.json`, or other **exported** presets.
  TypeScript resolves those paths relative to the preset file, not the consumer.
- Commit co-located **`*.d.ts`** or **`*.d.ts.map`** build artifacts.
- Let the reference generator patch exported preset files.

## Vue packages

### Do

- Point **external** project references at a dependency's package-root
  **`tsconfig.json`**, never its `tsconfig.app.json` leaf.
- Use the **app/node split** (`tsconfig.app.json` + optional `tsconfig.node.json`)
  at the Vue package root; enable `composite` on leaves that emit.
- Override `@vue/tsconfig`'s default **`noEmit: true`** in the Vue app preset when
  the package participates in solution builds.

### Don't

- Reference another package's `tsconfig.app.json` directly from outside that
  package.

## Query and mutation factories (TanStack Query)

Patterns that work well with composite emit and `useQuery` / `useMutation`
overload resolution:

### Do

- Let **`queryOptions()` infer** its return type; type the **`queryFn`** return
  (`Promise<WireResponse>`) or use a small **wire type alias**
  (`Awaited<ReturnType<typeof fetch…>>`).
- Use **stable query keys** with refs in the array when the query is driven by a
  `Ref` (e.g. `queryKey: ["resource", idRef, "segment"]`), matching other queries
  in the codebase.
- For page **loaders** consumed by `AsyncPage`, use an explicit loader return type
  (e.g. `UseQueryReturnType<…>` per query field) so the loader record is
  assignable to `LoaderQueries`.
- For mutation hooks that hit **`TS7056`** (inferred type too large to serialize in
  `.d.ts`), use a **short exported alias** (e.g. `SdkMutation<TVariables>`) and
  an **impl + wrapper + cast** pattern on the exported hook.

### Don't

- Annotate query factories as **`QueryOptions<unknown, Error>`** (or other overly
  wide annotations). That breaks `useQuery({ ...spread })` and cascades to `{}`
  data types.
- Cast the entire `queryOptions()` result to **`QueryOptions<…>`** if it widens
  **`queryKey`** — overload matching will fail.
- Export **`ReturnType<typeof useMutation(…)>`** directly when the inferred type
  exceeds the compiler serialization limit.

## Spec vs generated client types

### Do

- Treat the **spec / schema package** as the source of domain types (entities,
  request bodies, enums).
- Derive **wire response types** from the HTTP client when appropriate:
  `Awaited<ReturnType<typeof fetchResource>>`.
- Cast at the **boundary** when OpenAPI or client inference diverges from spec
  branded types (common for dossier-style property bags).

### Don't

- Assume client `handleResponse` / SDK inference always matches spec types without
  checking — fix at the factory or with a documented cast, not silent `unknown`.

## When types feel "wrong" after enabling composite

| Symptom                                  | Likely cause                                     | Fix                                                       |
| ---------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| `TS6059` / `TS6307`                      | Cross-package relative import                    | Switch to package export import                           |
| Mass `TS6305` after clean                | Stale `.tsbuildinfo`                             | `--force` or delete `node_modules/.tmp/*.tsbuildinfo`     |
| `TS2769` on `useQuery`                   | Bad `QueryOptions` annotation or `queryKey` cast | Remove wide return type; fix key shape                    |
| `TS7056` on export                       | Inferred type too large                          | Short alias, impl/export split, or `: any` on export only |
| `Property X does not exist on type '{}'` | Upstream query typed as `unknown`                | Fix query factory typing (see above)                      |
| Reference cycle reported                 | Workspace dep cycle                              | Restructure packages, don't drop edges                    |

## Summary for agents

1. **Respect package boundaries** — package imports only; update `exports` + references.
2. **Keep presets dumb** — per-package `outDir` / `include` / `references` on leaves.
3. **Prefer inference at the call site** — type `queryFn` / variables, not huge hook return types.
4. **Fix cycles in the graph**, not in the type checker.
5. **Run `tsconfig check`** before considering typecheck work done.
