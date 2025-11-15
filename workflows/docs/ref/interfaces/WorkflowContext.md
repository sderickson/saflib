[**@saflib/workflows**](../index.md)

---

# Interface: WorkflowContext

Context shared across all workflow machines.

## Properties

### agentConfig?

> `optional` **agentConfig**: [`AgentConfig`](AgentConfig.md)

---

### checklist

> **checklist**: `ChecklistItem`[]

Short descriptions of every step taken in the workflow. Can be used
either to generate a sample checklist for a workflow, or a summary
of the work done by a completed workflow. Workflows build these recursively.

---

### copiedFiles?

> `optional` **copiedFiles**: `Record`\<`string`, `string`\>

The key is the id of the file, and the value is the absolute path to the file.

---

### cwd

> **cwd**: `string`

---

### docFiles?

> `optional` **docFiles**: `Record`\<`string`, `string`\>

---

### manageVersionControl?

> `optional` **manageVersionControl**: `"git"`

Opt in to having the workflow tool check git changes are expected, and commit them if they are. If they aren't, the workflow tool prompts the agent to justify its changes, and either commit or revert them.

This field is ignored in "dry" and "script" modes.

---

### runMode

> **runMode**: [`WorkflowRunMode`](../type-aliases/WorkflowRunMode.md)

The mode to run the workflow in.

- "dry": do not print out logs or prompts, do not halt, just run the whole workflow and return the output. Useful for getting a checklist.
- "print": print out logs and prompts, halt at prompts. "Normal" execution mode.
- "script": skip prompts and checks, just run command and copy steps. Useful for debugging templates and scripts.
- "run": runs the workflow at the top level, so it invokes agents, rather than agents invoking the tool. agentConfig is included in this mode.

---

### skipTodos?

> `optional` **skipTodos**: `boolean`

---

### systemPrompt?

> `optional` **systemPrompt**: `string`

Optional prompt to be printed above every step prompt. Use to remind the
agent what the workflow is for, especially if it's a long one.

---

### templateFiles?

> `optional` **templateFiles**: `Record`\<`string`, `string`\>
