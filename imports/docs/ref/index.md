**@saflib/imports**

---

# @saflib/imports

## Interfaces

| Interface                                                | Description                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| [DetectCyclesOptions](interfaces/DetectCyclesOptions.md) | Shared options for graph walks (`measure`, `why`, `cycles`). |
| [MeasureGraphOptions](interfaces/MeasureGraphOptions.md) | -                                                            |
| [MeasureGraphResult](interfaces/MeasureGraphResult.md)   | -                                                            |

## Type Aliases

| Type Alias                                           | Description                                                                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [Cycle](type-aliases/Cycle.md)                       | One cycle as an ordered list of absolute file paths (last equals first).                                                                     |
| [FindPathResult](type-aliases/FindPathResult.md)     | Shortest import path from entry to target as display labels (entry path, then each import specifier along the chain). `null` if unreachable. |
| [GraphWalkOptions](type-aliases/GraphWalkOptions.md) | Shared options for graph walks (`measure`, `why`, `cycles`).                                                                                 |

## Functions

| Function                                  | Description                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [detectCycles](functions/detectCycles.md) | Detect circular dependencies among first-party modules via DFS back-edges.                                                         |
| [findPath](functions/findPath.md)         | BFS for the shortest import path from `entryPath` to `target`.                                                                     |
| [measureGraph](functions/measureGraph.md) | Walk the static import graph from `entryPath` and count first-party modules, total lines, and distinct external npm package roots. |
