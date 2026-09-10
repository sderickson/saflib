[**@saflib/imports**](../../../index.md)

---

# src/tsconfig/detect-cycles

## Type Aliases

| Type Alias                                       | Description                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| [ReferenceCycle](type-aliases/ReferenceCycle.md) | One cycle as an ordered list of package names (last equals first). |

## Functions

| Function                                                    | Description                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| [detectReferenceCycles](functions/detectReferenceCycles.md) | Detect cycles in the package-level reference graph via DFS back-edges. |
