import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  XStateWorkflow,
  copyTemplateStateComposer,
  updateTemplateFileComposer,
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
  pascalCommandName: string;
  camelCommandName: string;
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

  initial: "updateMainFile",

  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "add-commands");
    const targetDir = path.join(process.cwd(), "commands");

    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      sourceDir,
      targetDir,
      commandName: input.name,
      pascalCommandName:
        input.name.charAt(0).toUpperCase() + input.name.slice(1),
      camelCommandName:
        input.name.charAt(0).toLowerCase() + input.name.slice(1),
      ...contextFromInput(input),
    };
  },

  entry: logInfo("Successfully began workflow"),

  states: {
    ...updateTemplateFileComposer<AddCommandWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.commandName}.ts`),
      promptMessage: (context) =>
        `Please update ${context.commandName}.ts to implement the command functionality. This should create a new Command instance, set up the context, and add the command to the program. Follow the pattern from the existing index.ts file but without importing any "addXCommand" functions.`,
      stateName: "updateMainFile",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class AddCommandWorkflow extends XStateWorkflow {
  machine = AddCommandWorkflowMachine;
  description = "Creates a new command for the @saflib/commander package";

  cliArguments = [
    {
      name: "name",
      description:
        "The name of the command to create (e.g., 'my-command' or 'process-data')",
      exampleValue: "my-command",
    },
  ];
  sourceUrl = import.meta.url;
}
