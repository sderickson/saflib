**@saflib/workflows**

***

# @saflib/workflows

## Classes

| Class | Description |
| ------ | ------ |
| [XStateWorkflowRunner](classes/XStateWorkflowRunner.md) | A class used to load and run the workflow, managing XState events and I/O operations. This is an abstract super class and should be subclassed with the WorkflowDefinition and other properties set. Those subclasses are what the CLI tool uses to create and run workflows. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CommandStepInput](interfaces/CommandStepInput.md) | Input for the CommandStepMachine. These arguments are passed to Node's [`spawn`](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options) function. |
| [CopyStepInput](interfaces/CopyStepInput.md) | Input for the CopyStepMachine. |
| [DocStepInput](interfaces/DocStepInput.md) | Input for the DocStepMachine. |
| [PromptStepInput](interfaces/PromptStepInput.md) | Input for the PromptStepMachine. |
| [TestStepInput](interfaces/TestStepInput.md) | Input for the TestStepMachine. |
| [UpdateStepInput](interfaces/UpdateStepInput.md) | Input for the UpdateStepMachine. |
| [WorkflowArgument](interfaces/WorkflowArgument.md) | Required argument for the workflow, in a format the CLI tool (or other program) can use. |
| [WorkflowDefinition](interfaces/WorkflowDefinition.md) | An interface that includes the inputs, files, steps, and everything else that makes up a workflow. Can be used to create an XState machine which can be used in other workflows, and an XStateWorkflowRunner which will execute just the workflow itself. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ConcreteWorkflowRunner](type-aliases/ConcreteWorkflowRunner.md) | A concrete subclass of XStateWorkflowRunner. Packages which export workflows should use this to type the array of workflow classes. This is the type which the CLI tool accepts to provide a list of workflows. |
| [WorkflowStep](type-aliases/WorkflowStep.md) | A step in a workflow with an actor and its corresponding input. |

## Variables

| Variable | Description |
| ------ | ------ |
| [CommandStepMachine](variables/CommandStepMachine.md) | Runs a shell command as part of a workflow. Stops the workflow if the command fails. |
| [CopyStepMachine](variables/CopyStepMachine.md) | Copies all `templateFiles` to the given directory, renaming all instances of `"template-file"` to the given `name`. Also replaces other variants of the string: camelCase, snake_case, and PascalCase. |
| [DocStepMachine](variables/DocStepMachine.md) | Prompts the agent to read a document from the `docFiles` property for the workflow. |
| [PromptStepMachine](variables/PromptStepMachine.md) | Prompts the agent or user to do something. Stops the workflow until the workflow is continued. |
| [TestStepMachine](variables/TestStepMachine.md) | Runs either a single test in the package or all tests in the package. Stops the workflow if the test(s) fail. |
| [UpdateStepMachine](variables/UpdateStepMachine.md) | Prompts the agent to update one of the templateFiles that was copied over by the CopyStepMachine. |

## Functions

| Function | Description |
| ------ | ------ |
| [makeWorkflowMachine](functions/makeWorkflowMachine.md) | Takes a WorkflowsDefinition, as well as its Context and Input types, and creates an XState machine. |
| [runWorkflowCli](functions/runWorkflowCli.md) | Given a list of workflow classes, runs a CLI for running workflows. |
| [step](functions/step.md) | Helper function for defining a step in a workflow, enforcing types properly. |
