[**@saflib/workflows**](../index.md)

***

# Function: runWorkflowCli()

> **runWorkflowCli**(`workflows`): `void`

Uses Commander.js to run a CLI for running workflows.

The @saflib/workflows package can't run the CLI because other packages
depend on it to make workflows. So a separate package needs to depend on
those packages which depend on @saflib/workflows. This export allows
a separate package to actually compose and expose the CLI.

This also means you can customize which workflows are actually available.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `workflows` | [`ConcreteWorkflow`](../type-aliases/ConcreteWorkflow.md)[] |

## Returns

`void`
