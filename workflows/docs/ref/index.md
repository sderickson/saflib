**@saflib/workflows**

---

# @saflib/workflows

## Interfaces

| Interface                                                      | Description                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [AgentConfig](interfaces/AgentConfig.md)                       | When in "run" mode, specify which agent to use.                                          |
| [CommandStepInput](interfaces/CommandStepInput.md)             | Input for the CommandStepMachine.                                                        |
| [CopyStepInput](interfaces/CopyStepInput.md)                   | Input for the CopyStepMachine.                                                           |
| [CwdStepInput](interfaces/CwdStepInput.md)                     | Input for the CwdStepMachine.                                                            |
| [ParsePackageNameInput](interfaces/ParsePackageNameInput.md)   | Argument for the parsePackageName function.                                              |
| [ParsePackageNameOutput](interfaces/ParsePackageNameOutput.md) | Return value for the parsePackageName function.                                          |
| [ParsePathInput](interfaces/ParsePathInput.md)                 | Argument for the parsePath function.                                                     |
| [ParsePathOutput](interfaces/ParsePathOutput.md)               | Return value for the parsePath function.                                                 |
| [PromptStepInput](interfaces/PromptStepInput.md)               | Input for the PromptStepMachine.                                                         |
| [RunWorkflowOptions](interfaces/RunWorkflowOptions.md)         | Argument for the runWorkflow function.                                                   |
| [RunWorkflowResult](interfaces/RunWorkflowResult.md)           | Return value of the runWorkflow function.                                                |
| [UpdateStepInput](interfaces/UpdateStepInput.md)               | Input for the UpdateStepMachine.                                                         |
| [WorkflowArgument](interfaces/WorkflowArgument.md)             | Required argument for the workflow, in a format the CLI tool (or other program) can use. |
| [WorkflowCliOptions](interfaces/WorkflowCliOptions.md)         | Options for configuring the workflow CLI                                                 |
| [WorkflowDefinition](interfaces/WorkflowDefinition.md)         | An interface that includes everything that makes up a workflow.                          |
| [WorkflowLogger](interfaces/WorkflowLogger.md)                 | Logger interface for workflow operations                                                 |
| [WorkflowLoggerOptions](interfaces/WorkflowLoggerOptions.md)   | Options for creating a workflow logger                                                   |

## Type Aliases

| Type Alias                                                     | Description                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| [AgentCLI](type-aliases/AgentCLI.md)                           | The agent to use for the workflow.                              |
| [GetSourceUrlFunction](type-aliases/GetSourceUrlFunction.md)   | Function type for getting source URLs from absolute file paths. |
| [WorkflowExecutionMode](type-aliases/WorkflowExecutionMode.md) | The mode to run the workflow in.                                |
| [WorkflowStep](type-aliases/WorkflowStep.md)                   | A step in a workflow with an actor and its corresponding input. |

## Variables

| Variable                                              | Description                                                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [CommandStepMachine](variables/CommandStepMachine.md) | Runs a shell command as part of a workflow. Stops the workflow if the command fails.                                              |
| [CopyStepMachine](variables/CopyStepMachine.md)       | Copies all `templateFiles` to the given directory, performing string replacements for directories, file names, and file contents. |
| [CwdStepMachine](variables/CwdStepMachine.md)         | Updates the current working directory for subsequent steps, such as "copy", "update", and "command".                              |
| [PromptStepMachine](variables/PromptStepMachine.md)   | Prompts the agent or user to do an arbitrary task.                                                                                |
| [UpdateStepMachine](variables/UpdateStepMachine.md)   | Prompts the agent to update one of the templateFiles that was copied over by the CopyStepMachine.                                 |

## Functions

| Function                                                | Description                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [checklistToString](functions/checklistToString.md)     | Convenience function to convert a checklist to a string.                                                                                                                                                                     |
| [defineWorkflow](functions/defineWorkflow.md)           | Helper, identity function to infer types.                                                                                                                                                                                    |
| [getPackageName](functions/getPackageName.md)           | Reads the package.json for the given cwd and returns the package name.                                                                                                                                                       |
| [makeLineReplace](functions/makeLineReplace.md)         | Creates a line-replace function which will handle template interpolation, given a context.                                                                                                                                   |
| [makeWorkflowMachine](functions/makeWorkflowMachine.md) | Takes a WorkflowsDefinition, as well as its Context and Input types, and creates an XState machine.                                                                                                                          |
| [parsePackageName](functions/parsePackageName.md)       | Takes a package name and returns a breakdown into conventional parts for templating.                                                                                                                                         |
| [parsePath](functions/parsePath.md)                     | Takes a target path to a file and breaks it down into conventional parts for templating.                                                                                                                                     |
| [runWorkflow](functions/runWorkflow.md)                 | Convenience function to take a WorkflowDefinition, run it in the specified mode, and return the output. Can be used to run a given workflow in checklist mode for a unit test. This is also used internally by the CLI tool. |
| [runWorkflowCli](functions/runWorkflowCli.md)           | Given a list of workflow classes, runs a CLI for running workflows.                                                                                                                                                          |
| [step](functions/step.md)                               | Helper function for defining a step in a workflow, enforcing types properly.                                                                                                                                                 |
