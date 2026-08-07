[**@saflib/imports**](../../../index.md)

---

# src/graph/detect-cycles

## Interfaces

| Interface                                                | Description                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| [DetectCyclesOptions](interfaces/DetectCyclesOptions.md) | Shared options for graph walks (`measure`, `why`, `cycles`). |

## Type Aliases

| Type Alias                     | Description                                                              |
| ------------------------------ | ------------------------------------------------------------------------ |
| [Cycle](type-aliases/Cycle.md) | One cycle as an ordered list of absolute file paths (last equals first). |

## Functions

| Function                                  | Description                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| [detectCycles](functions/detectCycles.md) | Detect circular dependencies among first-party modules via DFS back-edges. |
