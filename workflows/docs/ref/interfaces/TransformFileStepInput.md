[**@saflib/workflows**](../index.md)

---

# Interface: TransformFileStepInput

Input for the TransformFileStepMachine.

## Properties

### description?

> `optional` **description**: `string`

Description for the checklist output (e.g., "Add workspace entry to package.json").

---

### filePath

> **filePath**: `string`

Path to the file to transform. Resolved relative to the workflow's cwd.

---

### skipIfMissing?

> `optional` **skipIfMissing**: `boolean`

If true and the file does not exist, skip without error (useful for optional
product files such as deploy env templates).

---

### transform()

> **transform**: (`content`) => `string`

A function that receives the raw file content and returns the updated content.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `content` | `string` |

#### Returns

`string`
