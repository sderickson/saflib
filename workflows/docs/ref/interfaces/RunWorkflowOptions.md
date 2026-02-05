[**@saflib/workflows**](../index.md)

---

# Interface: RunWorkflowOptions

Argument for the runWorkflow function.

## Properties

### agentConfig?

> `optional` **agentConfig**: [`AgentConfig`](AgentConfig.md)

The agent config to use for the workflow. Required if runMode is "run".

---

### args?

> `optional` **args**: `string`[]

The arguments to pass to the workflow.

---

### definition

> **definition**: [`WorkflowDefinition`](WorkflowDefinition.md)\<`any`, `any`\>

The workflow definition to run.

---

### manageVersionControl?

> `optional` **manageVersionControl**: `"git"`

If included, the workflow tool will check file changes, push back on unexpected changes, and commit expected changes automatically.

---

### runMode

> **runMode**: [`WorkflowExecutionMode`](../type-aliases/WorkflowExecutionMode.md)

The mode to run the workflow in.

---

### skipTodos?

> `optional` **skipTodos**: `boolean`

Whether to skip TODOs in the workflow. They're already skipped in "dry", "checklist", and "script" modes; this is mainly used to override the default behaviors, for example in automated testing of run and print modes.
