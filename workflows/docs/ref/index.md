**@saflib/workflows**

***

# @saflib/workflows

## Classes

| Class | Description |
| ------ | ------ |
| [XStateWorkflow](classes/XStateWorkflow.md) | Abstract superclass for XStateWorkflows. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CLIArgument](interfaces/CLIArgument.md) | Required argument for the workflow, in a format the CLI tool (commander) can use. |
| [CommandMachineInput](interfaces/CommandMachineInput.md) | - |
| [CopyTemplateMachineInput](interfaces/CopyTemplateMachineInput.md) | - |
| [DocMachineInput](interfaces/DocMachineInput.md) | - |
| [PromptMachineInput](interfaces/PromptMachineInput.md) | - |
| [TestMachineInput](interfaces/TestMachineInput.md) | - |
| [UpdateMachineInput](interfaces/UpdateMachineInput.md) | - |
| [Workflow](interfaces/Workflow.md) | A workflow definition. Can be used to create an XState machine which, when run, will execute the workflow. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ConcreteWorkflow](type-aliases/ConcreteWorkflow.md) | Some subclass of Workflow which implements all abstract methods and properties. |
| [CreateArgsType](type-aliases/CreateArgsType.md) | - |
| [Step](type-aliases/Step.md) | A step in a workflow with an actor and its corresponding input. |

## Variables

| Variable | Description |
| ------ | ------ |
| [CommandStepMachine](variables/CommandStepMachine.md) | - |
| [CopyTemplateMachine](variables/CopyTemplateMachine.md) | - |
| [DocStepMachine](variables/DocStepMachine.md) | - |
| [PromptStepMachine](variables/PromptStepMachine.md) | A machine for a step in a workflow, where an LLM is prompted to do something. |
| [TestStepMachine](variables/TestStepMachine.md) | - |
| [UpdateStepMachine](variables/UpdateStepMachine.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [makeWorkflowMachine](functions/makeWorkflowMachine.md) | From a Workflow object, create an XState machine. |
| [outputFromContext](functions/outputFromContext.md) | Helper function to create `WorkflowOutput` from `WorkflowContext`. |
| [runWorkflowCli](functions/runWorkflowCli.md) | Uses Commander.js to run a CLI for running workflows. |
| [step](functions/step.md) | Helper function for defining a step in a workflow, enforcing types properly. |
