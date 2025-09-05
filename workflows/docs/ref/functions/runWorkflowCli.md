[**@saflib/workflows**](../index.md)

---

# Function: runWorkflowCli()

> **runWorkflowCli**(`workflows`): `void`

Given a list of workflow classes, runs a CLI for running workflows.

The @saflib/workflows package can't run the CLI because other packages
depend on it to make workflows. So a separate package needs to depend on
those packages which depend on @saflib/workflows. This export allows
a separate package to actually gather all the ConcreteWorkflowRunners and expose them as a CLI.

Use this also to customize which workflows are actually available.

## Parameters

| Parameter   | Type                                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| `workflows` | [`WorkflowDefinition`](../interfaces/WorkflowDefinition.md)\<`any`, `any`\>[] |

## Returns

`void`
