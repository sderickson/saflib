**@saflib/workflows**

***

# @saflib/workflows

## Classes

| Class | Description |
| ------ | ------ |
| [SimpleWorkflow](classes/SimpleWorkflow.md) | - |
| [Workflow](classes/Workflow.md) | - |
| [XStateWorkflow](classes/XStateWorkflow.md) | - |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ChecklistItem](interfaces/ChecklistItem.md) | - |
| [CLIArgument](interfaces/CLIArgument.md) | - |
| [CopyTemplateMachineContext](interfaces/CopyTemplateMachineContext.md) | - |
| [CopyTemplateMachineInput](interfaces/CopyTemplateMachineInput.md) | - |
| [FactoryFunctionOptions](interfaces/FactoryFunctionOptions.md) | - |
| [LogParams](interfaces/LogParams.md) | - |
| [Step](interfaces/Step.md) | - |
| [TemplateWorkflowContext](interfaces/TemplateWorkflowContext.md) | - |
| [WorkflowBlob](interfaces/WorkflowBlob.md) | - |
| [WorkflowBlobInternalState](interfaces/WorkflowBlobInternalState.md) | - |
| [WorkflowContext](interfaces/WorkflowContext.md) | - |
| [WorkflowInput](interfaces/WorkflowInput.md) | - |
| [WorkflowMeta](interfaces/WorkflowMeta.md) | - |
| [WorkflowOutput](interfaces/WorkflowOutput.md) | - |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ConcreteWorkflow](type-aliases/ConcreteWorkflow.md) | - |
| [Result](type-aliases/Result.md) | - |
| [WorkflowStatus](type-aliases/WorkflowStatus.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [CopyTemplateMachine](variables/CopyTemplateMachine.md) | - |
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
| [copyTemplateStateFactory](functions/copyTemplateStateFactory.md) | - |
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
| [runNpmCommandFactory](functions/runNpmCommandFactory.md) | - |
| [runTestsFactory](functions/runTestsFactory.md) | - |
| [runWorkflowCli](functions/runWorkflowCli.md) | - |
| [updateTemplateFileFactory](functions/updateTemplateFileFactory.md) | - |
