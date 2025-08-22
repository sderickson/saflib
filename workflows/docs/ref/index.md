**@saflib/workflows**

***

# @saflib/workflows

## Classes

| Class | Description |
| ------ | ------ |
| [~~SimpleWorkflow~~](classes/SimpleWorkflow.md) | First iteration of workflows. Opted to try using XState instead for plenty of built in FSM features and tooling. |
| [Workflow](classes/Workflow.md) | Abstract superclass for SimpleWorkflow and XStateWorkflow. To be removed when XStateWorkflow is fully adopted. |
| [XStateWorkflow](classes/XStateWorkflow.md) | Abstract superclass for XStateWorkflows. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ChecklistItem](interfaces/ChecklistItem.md) | Simple checklist object. Machines should append one to the list for each state. If a state invokes another machine, add its checklist output as subitems to create a recursively generated checklist tree. |
| [CLIArgument](interfaces/CLIArgument.md) | Required argument for the workflow, in a format the CLI tool (commander) can use. |
| [ComposerFunctionOptions](interfaces/ComposerFunctionOptions.md) | Options for all composer functions. These functions return an object which can be spread into an XState "states" object, for easily composing a workflow machine from common steps. |
| [LogParams](interfaces/LogParams.md) | Params for the log action. |
| [~~Step~~](interfaces/Step.md) | - |
| [TemplateWorkflowContext](interfaces/TemplateWorkflowContext.md) | There are at least two machines which work on templates: creating and updating. These share some common context properties in addition to WorkflowContext properties. |
| [~~WorkflowBlob~~](interfaces/WorkflowBlob.md) | - |
| [~~WorkflowBlobInternalState~~](interfaces/WorkflowBlobInternalState.md) | - |
| [WorkflowContext](interfaces/WorkflowContext.md) | Context shared across all workflow machines. |
| [WorkflowInput](interfaces/WorkflowInput.md) | Inputs every workflow machine receives. |
| [WorkflowMeta](interfaces/WorkflowMeta.md) | Wrapper around a ConcreteWorkflow class. Honestly might not be necessary and could likely be removed. |
| [WorkflowOutput](interfaces/WorkflowOutput.md) | Outputs every workflow machine returns. |
| [XStateMachineStates](interfaces/XStateMachineStates.md) | State objects which can be passed into [XStateMachine Actor Definitions](https://stately.ai/docs/state-machine-actors). These are typed simply here because I'll be damned if I can figure out how to use the XState library's provided generics. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ConcreteWorkflow](type-aliases/ConcreteWorkflow.md) | - |
| [~~WorkflowStatus~~](type-aliases/WorkflowStatus.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [sampleWorkflows](variables/sampleWorkflows.md) | - |
| [workflowActionImplementations](variables/workflowActionImplementations.md) | - |
| [workflowActors](variables/workflowActors.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [addNewLinesToString](functions/addNewLinesToString.md) | Given a string which may have newlines already included, add /n to each line such that no line is longer than maxLineWidth. |
| [allChildrenSettled](functions/allChildrenSettled.md) | - |
| [concreteWorkflowToMeta](functions/concreteWorkflowToMeta.md) | - |
| [contextFromInput](functions/contextFromInput.md) | - |
| [copyTemplateStateComposer](functions/copyTemplateStateComposer.md) | Composer for copying template files to a target directory. Also replaces every instance "template-file", "template_file", "TemplateFile", and "templateFile" with the name of the thing being created, passed in via the CLI or other interface. To use this composer, the machine context must extend TemplateWorkflowContext. |
| [createChain](functions/createChain.md) | Creates a chain of XState machine states from an array of factory functions. |
| [doesTestPass](functions/doesTestPass.md) | - |
| [doTestsPass](functions/doTestsPass.md) | - |
| [doTestsPassSync](functions/doTestsPassSync.md) | - |
| [generateMigrations](functions/generateMigrations.md) | - |
| [getCurrentPackage](functions/getCurrentPackage.md) | - |
| [getGitHubUrl](functions/getGitHubUrl.md) | - |
| [getPackageName](functions/getPackageName.md) | - |
| [kebabCaseToCamelCase](functions/kebabCaseToCamelCase.md) | - |
| [kebabCaseToPascalCase](functions/kebabCaseToPascalCase.md) | - |
| [kebabCaseToSnakeCase](functions/kebabCaseToSnakeCase.md) | - |
| [logError](functions/logError.md) | - |
| [logInfo](functions/logInfo.md) | - |
| [logWarn](functions/logWarn.md) | - |
| [outputFromContext](functions/outputFromContext.md) | - |
| [print](functions/print.md) | - |
| [promptAgent](functions/promptAgent.md) | - |
| [promptAgentFactory](functions/promptAgentFactory.md) | - |
| [promptState](functions/promptState.md) | - |
| [runCommandAsync](functions/runCommandAsync.md) | - |
| [runNpmCommandComposer](functions/runNpmCommandComposer.md) | - |
| [runTestsFactory](functions/runTestsFactory.md) | - |
| [runWorkflowCli](functions/runWorkflowCli.md) | - |
| [updateTemplateFileComposer](functions/updateTemplateFileComposer.md) | - |
