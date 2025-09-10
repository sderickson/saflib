[**@saflib/workflows**](../index.md)

---

# Interface: CopyStepInput

Input for the CopyStepMachine.

## Properties

### lineReplace()?

> `optional` **lineReplace**: (`line`) => `string`

Optional argument to do custom string transformations of the template file.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `line`    | `string` |

#### Returns

`string`

---

### name

> **name**: `string`

kebab-case name of the thing being created from the template. Will be used to query replace instances of "template-file" and other variants like templateFile and template_file.

---

### targetDir

> **targetDir**: `string`

Absolute path to the directory where the updated copies of the template files will go.
