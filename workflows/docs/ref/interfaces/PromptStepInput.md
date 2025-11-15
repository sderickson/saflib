[**@saflib/workflows**](../index.md)

---

# Interface: PromptStepInput

Input for the PromptStepMachine.

## Properties

### promptText

> **promptText**: `string`

The text to be shown to the agent or user. The machine will then stop until the workflow is continued.

---

### skipIf?

> `optional` **skipIf**: `boolean`

A function that determines if the prompt should be skipped. Given the context and cwd.
