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

### ignoreError?

> `optional` **ignoreError**: `boolean`

---

### ~~promptOnError?~~

> `optional` **promptOnError**: `string`

The environment variables to set for the command.

#### Deprecated

Use `errorPrompt` instead.
