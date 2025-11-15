[**@saflib/workflows**](../index.md)

---

# Interface: UpdateStepOutput

Outputs every workflow machine returns.

## Extends

- [`WorkflowOutput`](WorkflowOutput.md)

## Properties

### agentConfig?

> `optional` **agentConfig**: [`AgentConfig`](AgentConfig.md)

#### Inherited from

[`WorkflowOutput`](WorkflowOutput.md).[`agentConfig`](WorkflowOutput.md#agentconfig)

---

### checklist

> **checklist**: `ChecklistItem`

Short descriptions of every step taken in the workflow. Can be used
either to generate a sample checklist for a workflow, or a summary
of the work done by a completed workflow. Workflows build these recursively.

#### Inherited from

[`WorkflowOutput`](WorkflowOutput.md).[`checklist`](WorkflowOutput.md#checklist)

---

### copiedFiles?

> `optional` **copiedFiles**: `Record`\<`string`, `string`\>

#### Inherited from

[`WorkflowOutput`](WorkflowOutput.md).[`copiedFiles`](WorkflowOutput.md#copiedfiles)

---

### filePath

> **filePath**: `string`

---

### newCwd?

> `optional` **newCwd**: `string`

#### Inherited from

[`WorkflowOutput`](WorkflowOutput.md).[`newCwd`](WorkflowOutput.md#newcwd)
