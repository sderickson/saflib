[**@saflib/workflows**](../index.md)

---

# Interface: PromptStepContext

## Extends

- `WorkflowContext`

## Properties

### checklist

> **checklist**: `ChecklistItem`[]

Short descriptions of every step taken in the workflow. Can be used
either to generate a sample checklist for a workflow, or a summary
of the work done by a completed workflow. Workflows build these recursively.

#### Inherited from

`WorkflowContext.checklist`

---

### copiedFiles?

> `optional` **copiedFiles**: `Record`\<`string`, `string`\>

The key is the id of the file, and the value is the absolute path to the file.

#### Inherited from

`WorkflowContext.copiedFiles`

---

### cwd

> **cwd**: `string`

#### Inherited from

`WorkflowContext.cwd`

---

### docFiles?

> `optional` **docFiles**: `Record`\<`string`, `string`\>

#### Inherited from

`WorkflowContext.docFiles`

---

### dryRun?

> `optional` **dryRun**: `boolean`

Flag to skip all execution of the workflow. Use to return before doing things
like file operations. This is necessary to get a checklist from a workflow
without actually operating it.

#### Inherited from

`WorkflowContext.dryRun`

---

### promptText

> **promptText**: `string`

---

### rootRef

> **rootRef**: `AnyActorRef`

Currently unused. I had a plan to use this to orchestrate halt events, or perhaps a mutex setup so that async work (such as Promise actors) can communicate to the runner that there's async work happening and the workflow should wait until it's done before exiting the program or whatever the runner will end up doing. But I've run into a few problems including that the ref doesn't properly get unserialized (possibly because it's the root node?), and I can't just send a signal directly to a consistently named actor (I tried passing "workflow-actor" as the id when kicking off and dehydrating, no dice).

I may futz with this again later, but it seems unlikely to work. In the meantime, I'm polling with "pollingWaitFor".

#### Inherited from

`WorkflowContext.rootRef`

---

### systemPrompt?

> `optional` **systemPrompt**: `string`

Optional prompt to be printed above every step prompt. Use to remind the
agent what the workflow is for, especially if it's a long one.

#### Inherited from

`WorkflowContext.systemPrompt`

---

### templateFiles?

> `optional` **templateFiles**: `Record`\<`string`, `string`\>

#### Inherited from

`WorkflowContext.templateFiles`
