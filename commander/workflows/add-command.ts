import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  XStateWorkflow,
  copyTemplateStateComposer,
  updateTemplateComposer,
  runTestsComposer,
  promptAgentComposer,
  type TemplateWorkflowContext,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddCommandWorkflowInput extends WorkflowInput {
  name: string;
  cliName?: string;
}

interface AddCommandWorkflowContext extends TemplateWorkflowContext {
  commandName: string;
  cliName: string;
  commandFilePath: string;
  commandFunctionName: string;
}

export const AddCommandWorkflowMachine = setup({
  types: {
    input: {} as AddCommandWorkflowInput,
    context: {} as AddCommandWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "add-command",

  initial: "copyTemplate",

  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "add-command");

    // The target directory will be commands/{input.name}
    const targetDir = path.join("./commands", input.name);
    const commandFilePath = path.join(targetDir, "index.ts");

    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      commandName: input.name,
      cliName: input.cliName || "saf-workflow",
      sourceDir,
      targetDir,
      commandFilePath,
      commandFunctionName: `add${input.name.charAt(0).toUpperCase() + input.name.slice(1)}Command`,
      ...contextFromInput(input),
    };
  },

  entry: logInfo("Successfully began add-command workflow"),

  // TODO: update the states to match the actual workflow you're creating. It will usually involve some combination of copying template files, updating files, and running tests.
  states: {
    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "updateMainFile",
    }),

    ...updateTemplateComposer<AddCommandWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, `${context.name}.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.ts to implement the main functionality. Replace any TODO comments with actual implementation.`,
      stateName: "updateMainFile",
      nextStateName: "updateConfigFile",
    }),

    ...updateTemplateComposer<AddCommandWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.config.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.config.ts with the appropriate configuration for this workflow.`,
      stateName: "updateConfigFile",
      nextStateName: "updateTests",
    }),

    ...updateTemplateComposer<AddCommandWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.test.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.test.ts to test the functionality you implemented. Make sure to mock any external dependencies.`,
      stateName: "updateTests",
      nextStateName: "runTests",
    }),

    ...runTestsComposer<AddCommandWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.test.ts`),
      stateName: "runTests",
      nextStateName: "verifyDone",
    }),

    ...promptAgentComposer<AddCommandWorkflowContext>({
      stateName: "verifyDone",
      nextStateName: "done",
      promptForContext: ({ context }) =>
        `Please verify that the ${context.name} workflow is working correctly. Test the functionality manually and ensure all files are properly configured.`,
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class AddCommandWorkflow extends XStateWorkflow {
  machine = AddCommandWorkflowMachine;
  description =
    "Creates a new CLI command and adds it to an existing Commander.js CLI";

  cliArguments = [
    {
      name: "name",
      description:
        "The name of the command to create (e.g., 'build' or 'deploy')",
      exampleValue: "example-command",
    },
  ];
  sourceUrl = import.meta.url;
}
