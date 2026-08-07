[**@saflib/imports**](../../index.md)

---

# src/types

## Interfaces

| Interface                                                | Description                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| [ImportSpec](interfaces/ImportSpec.md)                   | -                                                                     |
| [MeasureGraphOptions](interfaces/MeasureGraphOptions.md) | -                                                                     |
| [MeasureGraphResult](interfaces/MeasureGraphResult.md)   | -                                                                     |
| [PackageInfo](interfaces/PackageInfo.md)                 | Package metadata indexed by workspace package name.                   |
| [ResolvedExternal](interfaces/ResolvedExternal.md)       | Bare specifier that is not a workspace package (npm / Node built-in). |
| [ResolvedFile](interfaces/ResolvedFile.md)               | Successful resolve to a first-party workspace file.                   |

## Type Aliases

| Type Alias                                           | Description                                                                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [FindPathResult](type-aliases/FindPathResult.md)     | Shortest import path from entry to target as display labels (entry path, then each import specifier along the chain). `null` if unreachable. |
| [GraphWalkOptions](type-aliases/GraphWalkOptions.md) | Shared options for graph walks (`measure`, `why`, `cycles`).                                                                                 |
| [PackageIndex](type-aliases/PackageIndex.md)         | Index of workspace packages discovered under a monorepo root.                                                                                |
| [ResolveResult](type-aliases/ResolveResult.md)       | -                                                                                                                                            |
