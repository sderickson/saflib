# Overview

`@saflib/parser` provides **syntactic** TypeScript and Vue SFC analysis using `typescript`'s parser only. There is no type-checker, no `node_modules` resolution, and no dependency on the repo's composite build.

That makes it suitable for scanning **raw git blob content** at any commit without spinning up a full TypeScript program or checking out commits to file system, enabling quick static analysis and review of changes in the repository.

This library does not get used in day-to-day developer work. It underpins other tools such as [dev-site](../../dev-site/docs/01-overview.md).

## What this package provides

What information is extracted is determined by **what is important for a developer to know about** that is embedded in TypeScript. For example, in a code review, you'd probably want to know what dependencies, tests, API contracts, integrations, and data models have changed. Some of this information is readily available in NPM package.json, OpenAPI yaml, or other config files. But some is embedded in the code, mixed with less critical concerns such as implementation details. This package pulls out key bits for review and study.

| Export | Role |
| ------ | ---- |
| `extractExports` | Top-level exported symbols with syntactic signatures and leading JSDoc |
| `extractImports` | Static `import` / `export … from` edges with imported names |
| `extractTestCases` | Nested `describe` / `it` / `test` titles joined with `" > "` |
| `extractDrizzleTables` | `sqliteTable` / `pgTable` / `mysqlTable` definitions and columns |
| `extractLocalExportUsages` | Export names referenced as values elsewhere in the same file |
| `extractVueSfc`, `isVueSfc`, … | Parse Vue SFC script blocks; surface props, emits, models, root tag |

Return types are defined in [`types.ts`](../types.ts) (`ExportEntry`, `ImportEntry`, `TestCaseEntry`, `DrizzleTableEntry`, …).

## Design constraints

- **Syntactic only** — signatures are display strings from the AST, not resolved types. Re-exports like `export { foo }` may have `signature: null`.
- **No dynamic imports** — `extractImports` skips `import("…")`. (Import-graph walking in `@saflib/imports` uses a separate regex-based extractor tuned for that job.)
- **Stable test names** — `extractTestCases` uses `" > "` between nested describe titles; that separator is part of the public contract (stored in dev-site `blob_facts`).
- **Vue without filename** — `isVueSfc` detects SFCs from content alone so blob hashing stays path-agnostic.

## Integration

Primary consumer: [`@saflib/imports`](../imports/docs/01-overview.md) `buildFileSpecialty()` in `imports/src/facts/specialty.ts`, which composes parser extractors into a discriminated `FileSpecialty` (`source`, `test`, or `sql-table`).

That feeds [**dev-site**](../dev-site/docs/01-overview.md) commit analysis — `analyze-commit.ts` stores specialties in `blob_facts`, then assemblers build export inventories, spec/handler/test linkage, Drizzle DB inventory, and package metrics.

Product application code should **not** depend on `@saflib/parser`; use the TypeScript compiler API or typedoc when you need semantic analysis.

## When to extend

Add or adjust extractors here when dev-site or import-graph tooling needs new **syntax-shaped** facts (new export forms, test frameworks, Drizzle patterns). Keep extractors pure (`string` in → typed facts out) and cover behavior in [`index.test.ts`](../index.test.ts) / adjacent `*.test.ts` files.
