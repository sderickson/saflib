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

| Property       | Type                    | Description                                   |
| -------------- | ----------------------- | --------------------------------------------- |
| `logger`       | `WorkflowLoggerOptions` | Options for configuring the workflow logger   |
| `getSourceUrl` | `GetSourceUrlFunction`  | Function to convert file paths to source URLs |

## WorkflowLoggerOptions

| Property      | Type                     | Description                                            |
| ------------- | ------------------------ | ------------------------------------------------------ |
| `silent`      | `boolean`                | Whether to suppress log output (default: false)        |
| `serviceName` | `string`                 | Name of the service for logging (default: "workflows") |
| `format`      | `winston.Logform.Format` | Custom winston format (optional)                       |

## GetSourceUrlFunction

| Property       | Type     | Description                                |
| -------------- | -------- | ------------------------------------------ |
| `absolutePath` | `string` | The absolute file path to convert to a URL |

**Returns:** `string` - The source URL for the file

## Example

```typescript
import { runWorkflowCli } from "@saflib/workflows";
import { myWorkflows } from "./my-workflows";
import { getGitHubUrl } from "@saflib/dev-tools";

// Basic usage
runWorkflowCli(myWorkflows);

// With custom logging options
runWorkflowCli(myWorkflows, {
  logger: {
    silent: true, // Suppress all log output
  },
});

// With custom source URL function
runWorkflowCli(myWorkflows, {
  getSourceUrl: (absolutePath) => {
    // Use the dev-tools getGitHubUrl function
    return getGitHubUrl(absolutePath);
  },
});

// With both custom logger and source URL function
runWorkflowCli(myWorkflows, {
  logger: {
    silent: false,
  },
  getSourceUrl: (absolutePath) => {
    // Custom logic to generate source URLs
    return `https://my-custom-repo.com/blob/main${absolutePath}`;
  },
});
```
