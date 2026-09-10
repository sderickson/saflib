[**@saflib/workflows**](../index.md)

---

# Interface: WorkflowArgument

Required or optional argument for the workflow, in a format the CLI tool (or other program) can use.

## Properties

### description?

> `optional` **description**: `string`

---

### exampleValue?

> `optional` **exampleValue**: `string`

When generating an example checklist, this is the value that will be provided.

---

### name

> **name**: `string`

---

### type?

> `optional` **type**: `"string"` \| `"flag"`

When "flag", the argument is optional and passed as e.g. --upload or --no-upload.
Default is "string" (required positional).
