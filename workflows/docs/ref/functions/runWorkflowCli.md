[**@saflib/workflows**](../index.md)

---

# Function: runWorkflowCli()

> **runWorkflowCli**(`workflows`, `options?`): `void`

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
| `options`   | [`WorkflowCliOptions`](#workflowclioptions) (optional)                        |

## Returns

`void`

## WorkflowCliOptions

| Property | Type                    | Description                                 |
| -------- | ----------------------- | ------------------------------------------- |
| `logger` | `WorkflowLoggerOptions` | Options for configuring the workflow logger |

## WorkflowLoggerOptions

| Property      | Type                     | Description                                            |
| ------------- | ------------------------ | ------------------------------------------------------ |
| `silent`      | `boolean`                | Whether to suppress log output (default: false)        |
| `serviceName` | `string`                 | Name of the service for logging (default: "workflows") |
| `format`      | `winston.Logform.Format` | Custom winston format (optional)                       |

## Example

```typescript
import { runWorkflowCli } from "@saflib/workflows";
import { myWorkflows } from "./my-workflows";

// Basic usage
runWorkflowCli(myWorkflows);

// With custom logging options
runWorkflowCli(myWorkflows, {
  logger: {
    silent: true, // Suppress all log output
    serviceName: "my-custom-service",
  },
});
```
