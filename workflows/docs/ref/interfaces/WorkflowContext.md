[**@saflib/workflows**](../index.md)

***

# Interface: WorkflowContext

Context shared across all workflow machines.

## Extended by

- [`TemplateWorkflowContext`](TemplateWorkflowContext.md)

## Properties

### checklist

> **checklist**: [`ChecklistItem`](ChecklistItem.md)[]

Short descriptions of every step taken in the workflow. Can be used
either to generate a sample checklist for a workflow, or a summary
of the work done by a completed workflow. Workflows build these recursively.

***

### dryRun?

> `optional` **dryRun**: `boolean`

Flag to skip all execution of the workflow. Use to return before doing things
like file operations. This is necessary to get a checklist from a workflow
without actually operating it.

***

### loggedLast?

> `optional` **loggedLast**: `boolean`

Flag for if the last thing printed was a log message. This is just
to space logs and prompts out from each other.

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Optional prompt to be printed above every step prompt. Use to remind the
agent what the workflow is for, especially if it's a long one.
