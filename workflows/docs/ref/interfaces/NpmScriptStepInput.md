[**@saflib/workflows**](../index.md)

---

# Interface: NpmScriptStepInput

Input for the NpmScriptStepMachine.

## Properties

### args?

> `optional` **args**: `string`[]

Arguments forwarded after `--` to the underlying script.

---

### errorPrompt?

> `optional` **errorPrompt**: `string`

---

### forceInScript?

> `optional` **forceInScript**: `boolean`

When true, run this script even in script mode if it would otherwise be
treated as a skipped validation command (typecheck/test).

---

### ignoreError?

> `optional` **ignoreError**: `boolean`

---

### ~~promptOnError?~~

> `optional` **promptOnError**: `string`

#### Deprecated

Use `errorPrompt` instead.

---

### script

> **script**: `string`

npm script name from the target workspace package.json, e.g. `test`.

---

### workspace

> **workspace**: `string`

npm workspace name, e.g. `@fixture/npm-script-child`.
