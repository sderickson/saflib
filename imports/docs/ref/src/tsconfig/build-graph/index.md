[**@saflib/imports**](../../../index.md)

---

# src/tsconfig/build-graph

## Interfaces

| Interface                                                            | Description |
| -------------------------------------------------------------------- | ----------- |
| [BuildReferenceGraphResult](interfaces/BuildReferenceGraphResult.md) | -           |
| [ReferenceGraphNode](interfaces/ReferenceGraphNode.md)               | -           |

## Type Aliases

| Type Alias                                       | Description                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [ReferenceGraph](type-aliases/ReferenceGraph.md) | Package-level project-reference graph. Keys are workspace package names that participate in typecheck. |

## Functions

| Function                                                                          | Description                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [applyCompositionRootReferences](functions/applyCompositionRootReferences.md)     | Packages may declare `safImports.compositionRoot` in `package.json` to union additional project references beyond workspace dependencies (e.g. a monolith composition root that must reference every sibling service package).                |
| [buildReferenceGraph](functions/buildReferenceGraph.md)                           | Build a package-level TypeScript project-reference graph from workspace `dependencies`. Only packages with a typecheckable `tsconfig.json` become nodes; edges to packages without a tsconfig are dropped.                                    |
| [isGitIgnoredPackageDirectory](functions/isGitIgnoredPackageDirectory.md)         | Workspace members that exist on disk but are gitignored (e.g. saflib's product-init `deploy/`) are absent in CI. Skip them so local generate/check matches a clean checkout.                                                                  |
| [listGitIgnoredPackageDirectories](functions/listGitIgnoredPackageDirectories.md) | Batch `git check-ignore` for many package dirs under one repo root. Returns absolute paths that are ignored. One spawn instead of one per package.                                                                                            |
| [workspaceDepsOf](functions/workspaceDepsOf.md)                                   | Collect workspace package names listed in `dependencies` only. Dev dependencies (test harnesses, vitest, playwright, etc.) are omitted — they are not installed in production Docker builds and must not become composite project references. |
