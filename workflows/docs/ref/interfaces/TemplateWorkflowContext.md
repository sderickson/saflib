[**@saflib/workflows**](../index.md)

***

# Interface: TemplateWorkflowContext

There are at least two machines which work on templates: creating
and updating. These share some common context properties in addition
to WorkflowContext properties.

## Extends

- [`WorkflowContext`](WorkflowContext.md)

## Properties

### checklist

> **checklist**: [`ChecklistItem`](ChecklistItem.md)[]

Short descriptions of every step taken in the workflow. Can be used
either to generate a sample checklist for a workflow, or a summary
of the work done by a completed workflow. Workflows build these recursively.

#### Inherited from

[`WorkflowContext`](WorkflowContext.md).[`checklist`](WorkflowContext.md#checklist)

***

### dryRun?

> `optional` **dryRun**: `boolean`

Flag to skip all execution of the workflow. Use to return before doing things
like file operations. This is necessary to get a checklist from a workflow
without actually operating it.

#### Inherited from

[`WorkflowContext`](WorkflowContext.md).[`dryRun`](WorkflowContext.md#dryrun)

***

### loggedLast?

> `optional` **loggedLast**: `boolean`

Flag for if the last thing printed was a log message. This is just
to space logs and prompts out from each other.

#### Inherited from

[`WorkflowContext`](WorkflowContext.md).[`loggedLast`](WorkflowContext.md#loggedlast)

***

### name

> **name**: `string`

kebab-case name of the thing being created or updated, such as
"home" for a web page or "get-by-id" for a database query.

***

### pascalName

> **pascalName**: `string`

PascalCase version of the kebab-case name.

***

### sourceDir

> **sourceDir**: `string`

Absolute path to the directory where the template files are located.

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Optional prompt to be printed above every step prompt. Use to remind the
agent what the workflow is for, especially if it's a long one.

#### Inherited from

[`WorkflowContext`](WorkflowContext.md).[`systemPrompt`](WorkflowContext.md#systemprompt)

***

### targetDir

> **targetDir**: `string`

Absolute path to the directory where updated copies of the template files will go.
