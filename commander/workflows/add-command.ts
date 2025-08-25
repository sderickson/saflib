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
}

interface AddCommandWorkflowContext extends TemplateWorkflowContext {
  commandName: string;
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
    const sourceDir = path.join(__dirname, "add-commands");

    // The target directory will be the current working directory where the workflow is run
    const targetDir = process.cwd();

    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      commandName: input.name,
      sourceDir,
      targetDir,
      ...contextFromInput(input),
    };
  },

  entry: logInfo("Successfully began add-command workflow"),

  states: {
    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "updateCommandFile",
    }),

    ...updateTemplateComposer<AddCommandWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, `${context.name}.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.ts to implement the command functionality. Replace TODO comments with actual implementation.`,
      stateName: "updateCommandFile",
      nextStateName: "updateIndexFile",
    }),

    ...updateTemplateComposer<AddCommandWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, `index.ts`),
      promptMessage: (context) =>
        `Please update index.ts to import and use the new ${context.name} command. Uncomment the import and addCommand lines.`,
      stateName: "updateIndexFile",
      nextStateName: "verifyDone",
    }),

    ...promptAgentComposer<AddCommandWorkflowContext>({
      stateName: "verifyDone",
      nextStateName: "done",
      promptForContext: ({ context }) =>
        `Please verify that the ${context.name} command is working correctly. Test the functionality manually and ensure all files are properly configured.`,
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
    "Creates a new command for a Commander.js CLI application with proper context setup";

  cliArguments = [
    {
      name: "name",
      description:
        "The name of the command to create (e.g., 'build' or 'deploy')",
      exampleValue: "build",
    },
  ];
  sourceUrl = import.meta.url;
}
