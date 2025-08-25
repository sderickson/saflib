import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  XStateWorkflow,
  copyTemplateStateComposer,
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
    const sourceDir = path.join(__dirname, "add-command");

    // The target directory will be commands/{input.name}
    const targetDir = path.join(process.cwd(), "commands", input.name);

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
      nextStateName: "addToBin",
    }),

    ...promptAgentComposer<AddCommandWorkflowContext>({
      stateName: "addToBin",
      nextStateName: "verifyDone",
      promptForContext: ({ context }) =>
        `Please add the ${context.name} command to the package's bin folder. This typically involves:
1. Creating a bin/{context.name} file that imports and runs the CLI
2. Adding the bin entry to package.json
3. Making the bin file executable (chmod +x bin/{context.name})`,
    }),

    ...promptAgentComposer<AddCommandWorkflowContext>({
      stateName: "verifyDone",
      nextStateName: "done",
      promptForContext: ({ context }) =>
        `Please verify that the ${context.name} command is working correctly by running:
npm exec ${context.name} help

The command should display help information without errors.`,
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
