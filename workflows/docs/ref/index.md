**@saflib/workflows**

---

# @saflib/workflows

## Interfaces

| Interface                                                                    | Description                                                                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [AgentConfig](interfaces/AgentConfig.md)                                     | When in "run" mode, specify which agent to use.                                                      |
| [CdStepInput](interfaces/CdStepInput.md)                                     | Input for the CdStepMachine.                                                                         |
| [CommandStepInput](interfaces/CommandStepInput.md)                           | Input for the CommandStepMachine.                                                                    |
| [CopyStepInput](interfaces/CopyStepInput.md)                                 | Input for the CopyStepMachine.                                                                       |
| [IndexedWorkspacePackage](interfaces/IndexedWorkspacePackage.md)             | -                                                                                                    |
| [NpmScriptStepInput](interfaces/NpmScriptStepInput.md)                       | Input for the NpmScriptStepMachine.                                                                  |
| [ParsePackageNameInput](interfaces/ParsePackageNameInput.md)                 | Argument for the parsePackageName function.                                                          |
| [ParsePackageNameOutput](interfaces/ParsePackageNameOutput.md)               | Return value for the parsePackageName function.                                                      |
| [ParsePathInput](interfaces/ParsePathInput.md)                               | Argument for the parsePath function.                                                                 |
| [ParsePathOutput](interfaces/ParsePathOutput.md)                             | Return value for the parsePath function.                                                             |
| [PromptStepInput](interfaces/PromptStepInput.md)                             | Input for the PromptStepMachine.                                                                     |
| [RunWorkflowOptions](interfaces/RunWorkflowOptions.md)                       | Argument for the runWorkflow function.                                                               |
| [RunWorkflowResult](interfaces/RunWorkflowResult.md)                         | Return value of the runWorkflow function.                                                            |
| [TransformFileStepInput](interfaces/TransformFileStepInput.md)               | Input for the TransformFileStepMachine.                                                              |
| [UpdateStepInput](interfaces/UpdateStepInput.md)                             | Input for the UpdateStepMachine.                                                                     |
| [ValidateNpmScriptTargetParams](interfaces/ValidateNpmScriptTargetParams.md) | -                                                                                                    |
| [ValidateNpmScriptTargetResult](interfaces/ValidateNpmScriptTargetResult.md) | -                                                                                                    |
| [WorkflowArgument](interfaces/WorkflowArgument.md)                           | Required or optional argument for the workflow, in a format the CLI tool (or other program) can use. |
| [WorkflowCliOptions](interfaces/WorkflowCliOptions.md)                       | Options for configuring the workflow CLI                                                             |
| [WorkflowDefinition](interfaces/WorkflowDefinition.md)                       | An interface that includes everything that makes up a workflow.                                      |
| [WorkflowLogger](interfaces/WorkflowLogger.md)                               | Logger interface for workflow operations                                                             |
| [WorkflowLoggerOptions](interfaces/WorkflowLoggerOptions.md)                 | Options for creating a workflow logger                                                               |

## Type Aliases

| Type Alias                                                     | Description                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| [AgentCLI](type-aliases/AgentCLI.md)                           | The agent to use for the workflow.                              |
| [~~CwdStepInput~~](type-aliases/CwdStepInput.md)               | Old name                                                        |
| [GetSourceUrlFunction](type-aliases/GetSourceUrlFunction.md)   | Function type for getting source URLs from absolute file paths. |
| [OffshootInitContext](type-aliases/OffshootInitContext.md)     | -                                                               |
| [OffshootLayer](type-aliases/OffshootLayer.md)                 | -                                                               |
| [WorkflowExecutionMode](type-aliases/WorkflowExecutionMode.md) | The mode to run the workflow in.                                |
| [WorkflowStep](type-aliases/WorkflowStep.md)                   | A step in a workflow with an actor and its corresponding input. |

## Variables

| Variable                                                               | Description                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [CdStepMachine](variables/CdStepMachine.md)                            | Updates the current working directory for subsequent steps, such as "copy", "update", and "command".                                                                                                                                                              |
| [CommandStepMachine](variables/CommandStepMachine.md)                  | Runs a shell command as part of a workflow. Stops the workflow if the command fails.                                                                                                                                                                              |
| [CopyStepMachine](variables/CopyStepMachine.md)                        | Copies all `templateFiles` to the given directory, performing string replacements for directories, file names, and file contents.                                                                                                                                 |
| [CwdStepMachine](variables/CwdStepMachine.md)                          | Old name. Use CdStepMachine instead. @deprecated.                                                                                                                                                                                                                 |
| [DEFAULT\_SKIP\_SOURCE\_GLOBS](variables/DEFAULT_SKIP_SOURCE_GLOBS.md) | Always skipped when expanding directory template sources.                                                                                                                                                                                                         |
| [NpmScriptStepMachine](variables/NpmScriptStepMachine.md)              | Runs `npm run <script> -w <workspace>` with workspace/script validation in dry, checklist, print, run, and script modes. Delegates execution to the same runner used by CommandStepMachine.                                                                       |
| [PromptStepMachine](variables/PromptStepMachine.md)                    | Prompts the agent or user to do an arbitrary task.                                                                                                                                                                                                                |
| [TransformFileStepMachine](variables/TransformFileStepMachine.md)      | Programmatically transforms a file's content. Reads the file, applies the transform function, and writes the result back. Useful for structured edits (JSON, YAML, etc.) that are too mechanical for an agent prompt but need more control than template copying. |
| [UpdateStepMachine](variables/UpdateStepMachine.md)                    | Prompts the agent to update one of the templateFiles that was copied over by the CopyStepMachine.                                                                                                                                                                 |

## Functions

| Function                                                                    | Description                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [buildNpmRunArgs](functions/buildNpmRunArgs.md)                             | -                                                                                                                                                                                                                            |
| [checklistToString](functions/checklistToString.md)                         | Convenience function to convert a checklist to a string.                                                                                                                                                                     |
| [checkPackageDependency](functions/checkPackageDependency.md)               | Checks if the cwd's package.json has a given dependency. Throws an error if it does not.                                                                                                                                     |
| [defineWorkflow](functions/defineWorkflow.md)                               | Helper, identity function to infer types.                                                                                                                                                                                    |
| [findOutermostWorkspaceRoot](functions/findOutermostWorkspaceRoot.md)       | Walk up from `start` and return the outermost directory whose package.json declares `workspaces`.                                                                                                                            |
| [formatNpmScriptCommand](functions/formatNpmScriptCommand.md)               | -                                                                                                                                                                                                                            |
| [getPackageName](functions/getPackageName.md)                               | Reads the package.json for the given cwd and returns the package name.                                                                                                                                                       |
| [indexWorkspacePackages](functions/indexWorkspacePackages.md)               | Index every named package.json under a monorepo root (skipping vendor dirs).                                                                                                                                                 |
| [isScriptModeValidationCommand](functions/isScriptModeValidationCommand.md) | In script mode, skip agent-loop validation commands. Mechanical steps (install, saf-specs generate, prettier, …) still run; typecheck/test of unfinished scaffolds is asserted separately by CI harnesses when needed.       |
| [makeLineReplace](functions/makeLineReplace.md)                             | Creates a line-replace function which will handle template interpolation, given a context.                                                                                                                                   |
| [makeOffshootLineReplace](functions/makeOffshootLineReplace.md)             | Remap golden `@saflib/base-__offshoot-name__-*` / `Base*` tokens onto the target product + offshoot, then apply `__placeholder__` interpolation.                                                                             |
| [makeWorkflowMachine](functions/makeWorkflowMachine.md)                     | Takes a WorkflowsDefinition, as well as its Context and Input types, and creates an XState machine.                                                                                                                          |
| [npmScriptToCommandInput](functions/npmScriptToCommandInput.md)             | -                                                                                                                                                                                                                            |
| [parentLayerPackageJsonPath](functions/parentLayerPackageJsonPath.md)       | Parent weave host package.json — missing when scaffolding standalone saflib packages.                                                                                                                                        |
| [parsePackageName](functions/parsePackageName.md)                           | Takes a package name and returns a breakdown into conventional parts for templating.                                                                                                                                         |
| [parsePath](functions/parsePath.md)                                         | Takes a target path to a file and breaks it down into conventional parts for templating.                                                                                                                                     |
| [pollingWaitFor](functions/pollingWaitFor.md)                               | -                                                                                                                                                                                                                            |
| [resolveOffshootInitContext](functions/resolveOffshootInitContext.md)       | Resolve offshoot scaffold paths.                                                                                                                                                                                             |
| [runWorkflow](functions/runWorkflow.md)                                     | Convenience function to take a WorkflowDefinition, run it in the specified mode, and return the output. Can be used to run a given workflow in checklist mode for a unit test. This is also used internally by the CLI tool. |
| [runWorkflowCli](functions/runWorkflowCli.md)                               | Given a list of workflow classes, runs a CLI for running workflows.                                                                                                                                                          |
| [shouldSkipSourcePath](functions/shouldSkipSourcePath.md)                   | -                                                                                                                                                                                                                            |
| [step](functions/step.md)                                                   | Helper function for defining a step in a workflow, enforcing types properly.                                                                                                                                                 |
| [validateNpmScriptTarget](functions/validateNpmScriptTarget.md)             | Validate that an npm workspace and script exist. Throws on invalid targets in dry, checklist, print, run, and script modes (same policy as cd validation).                                                                   |
