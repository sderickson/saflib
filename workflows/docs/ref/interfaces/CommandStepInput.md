[**@saflib/workflows**](../index.md)

---

# Interface: CommandStepInput

Input for the CommandStepMachine.

These arguments are passed to Node's [`spawn`](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options) function.

## Properties

### args?

> `optional` **args**: `string`[]

List of arguments to pass to the command.

---

### command

> **command**: `string`

The command to run, such as `npm` or `chmod`.

---

### errorPrompt?

> `optional` **errorPrompt**: `string`

The message to show to the agent if the command fails.

---

### forceInScript?

> `optional` **forceInScript**: `boolean`

When true, run this command even in script mode if it would otherwise be
treated as a skipped validation command (typecheck/test). Use from CI
harnesses that intentionally typecheck after scaffolding.

---

### ignoreError?

> `optional` **ignoreError**: `boolean`

---

### ~~promptOnError?~~

> `optional` **promptOnError**: `string`

The environment variables to set for the command.

#### Deprecated

Use `errorPrompt` instead.
