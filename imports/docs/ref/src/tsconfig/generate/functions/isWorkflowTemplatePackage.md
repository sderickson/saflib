[**@saflib/imports**](../../../../index.md)

---

# Function: isWorkflowTemplatePackage()

> **isWorkflowTemplatePackage**(`packageDir`, `rootDir`): `boolean`

Workflow scaffold packages are workspace members but should not appear in
solution roots (they're templates, not shipped compilation units).

## Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `packageDir` | `string` |
| `rootDir`    | `string` |

## Returns

`boolean`
