[**@saflib/imports**](../../../../index.md)

---

# Function: extractImports()

> **extractImports**(`src`): [`ImportSpec`](../../../types/interfaces/ImportSpec.md)[]

Regex-based import extraction. No AST / compiler dependency.
Handles `import`, `export … from`, and dynamic `import()`.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `src`     | `string` |

## Returns

[`ImportSpec`](../../../types/interfaces/ImportSpec.md)[]
