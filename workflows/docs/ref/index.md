**@saflib/workflows**

---

# @saflib/workflows

## Classes

| Class                                       | Description                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Workflow](classes/Workflow.md)             | Abstract superclass for XStateWorkflow. Can probably be removed since SimpleWorkflows are gone. |
| [XStateWorkflow](classes/XStateWorkflow.md) | Abstract superclass for XStateWorkflows.                                                        |

## Interfaces

| Interface                                                                            | Description                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ChecklistItem](interfaces/ChecklistItem.md)                                         | Simple checklist object. Machines should append one to the list for each state. If a state invokes another machine, add its checklist output as subitems to create a recursively generated checklist tree.                                        |
| [CLIArgument](interfaces/CLIArgument.md)                                             | Required argument for the workflow, in a format the CLI tool (commander) can use.                                                                                                                                                                 |
| [ComposerFunctionOptions](interfaces/ComposerFunctionOptions.md)                     | Options for all composer functions. These functions return an object which can be spread into an XState "states" object, for easily composing a workflow machine from common steps.                                                               |
| [LogParams](interfaces/LogParams.md)                                                 | Params for the log action.                                                                                                                                                                                                                        |
| [RunNpmCommandFactoryOptions](interfaces/RunNpmCommandFactoryOptions.md)             | Options for the runNpmCommandComposer function.                                                                                                                                                                                                   |
| [RunTestsComposerOptions](interfaces/RunTestsComposerOptions.md)                     | Options for the runTestsComposer function.                                                                                                                                                                                                        |
| [TemplateWorkflowContext](interfaces/TemplateWorkflowContext.md)                     | There are at least two machines which work on templates: creating and updating. These share some common context properties in addition to WorkflowContext properties.                                                                             |
| [UpdateTemplateFileComposerOptions](interfaces/UpdateTemplateFileComposerOptions.md) | Options for the updateTemplateComposer function.                                                                                                                                                                                                  |
| [WorkflowContext](interfaces/WorkflowContext.md)                                     | Context shared across all workflow machines.                                                                                                                                                                                                      |
| [WorkflowInput](interfaces/WorkflowInput.md)                                         | Inputs every workflow machine receives.                                                                                                                                                                                                           |
| [WorkflowMeta](interfaces/WorkflowMeta.md)                                           | Wrapper around a ConcreteWorkflow class. Honestly might not be necessary and could likely be removed.                                                                                                                                             |
| [WorkflowOutput](interfaces/WorkflowOutput.md)                                       | Outputs every workflow machine returns.                                                                                                                                                                                                           |
| [XStateMachineStates](interfaces/XStateMachineStates.md)                             | State objects which can be passed into [XStateMachine Actor Definitions](https://stately.ai/docs/state-machine-actors). These are typed simply here because I'll be damned if I can figure out how to use the XState library's provided generics. |

## Type Aliases

| Type Alias                                           | Description                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| [ConcreteWorkflow](type-aliases/ConcreteWorkflow.md) | Some subclass of Workflow which implements all abstract methods and properties. |

## Variables

| Variable                                        | Description                           |
| ----------------------------------------------- | ------------------------------------- |
| [workflowActions](variables/workflowActions.md) | Common actions for workflow machines. |
| [workflowActors](variables/workflowActors.md)   | Common actors for workflow machines.  |

## Functions

| Function                                                            | Description                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [contextFromInput](functions/contextFromInput.md)                   | Helper function to create initial `WorkflowContext` from `WorkflowInput`.                                                                                                                                                                                                                                                       |
| [copyTemplateStateComposer](functions/copyTemplateStateComposer.md) | Composer for copying template files to a target directory. Also replaces every instance "template-file", "template_file", "TemplateFile", and "templateFile" with the name of the thing being created, passed in via the CLI or other interface. To use this composer, the machine context must extend TemplateWorkflowContext. |
| [getPackageName](functions/getPackageName.md)                       | Utility function to get the package name from the root URL.                                                                                                                                                                                                                                                                     |
| [logError](functions/logError.md)                                   | Action builder for logging error messages.                                                                                                                                                                                                                                                                                      |
| [logInfo](functions/logInfo.md)                                     | Action builder for logging info messages.                                                                                                                                                                                                                                                                                       |
| [outputFromContext](functions/outputFromContext.md)                 | Helper function to create `WorkflowOutput` from `WorkflowContext`.                                                                                                                                                                                                                                                              |
| [promptAgentComposer](functions/promptAgentComposer.md)             | Composer for prompting the agent. During normal execution, once a prompt is printed, the workflow will stop so it can be continued later.                                                                                                                                                                                       |
| [runNpmCommandComposer](functions/runNpmCommandComposer.md)         | Composer for running npm commands.                                                                                                                                                                                                                                                                                              |
| [runTestsComposer](functions/runTestsComposer.md)                   | Composer for running tests. Takes a specific file path to test.                                                                                                                                                                                                                                                                 |
| [runWorkflowCli](functions/runWorkflowCli.md)                       | Uses Commander.js to run a CLI for running workflows.                                                                                                                                                                                                                                                                           |
| [updateTemplateComposer](functions/updateTemplateComposer.md)       | Composer for updating files copied by states from copyTemplateStateComposer. Use this to provide specific instructions on how to update each file. In addition to prompting the agent to make changes, this will block the agent from continuing until all "todo" strings are gone from the file.                               |
