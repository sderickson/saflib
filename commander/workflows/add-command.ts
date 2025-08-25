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
  updateTemplateComposer,
  runNpmCommandComposer,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddCommandWorkflowInput extends WorkflowInput {
  name: string;
}

interface AddCommandWorkflowContext extends TemplateWorkflowContext {
  commandName: string;
  indexFilePath: string;
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
    const indexFilePath = path.join(targetDir, "index.ts");

    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      commandName: input.name,
      sourceDir,
      targetDir,
      indexFilePath,
      ...contextFromInput(input),
    };
  },

  entry: logInfo("Successfully began add-command workflow"),

  states: {
    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "updateIndexFile",
    }),

    ...updateTemplateComposer<AddCommandWorkflowContext>({
      stateName: "updateIndexFile",
      nextStateName: "makeIndexExecutable",
      filePath: (context) => context.indexFilePath,
      promptMessage: (context) =>
        `Please update ${context.indexFilePath}, resolving any TODOs.`,
    }),

    ...promptAgentComposer<AddCommandWorkflowContext>({
      stateName: "makeIndexExecutable",
      nextStateName: "addToBin",
      promptForContext: ({ context }) =>
        `Run the command \`chmod +x ${context.indexFilePath}\` to make the index file executable.`,
    }),

    ...promptAgentComposer<AddCommandWorkflowContext>({
      stateName: "addToBin",
      nextStateName: "install",
      promptForContext: ({ context }) =>
        `Add ${context.indexFilePath} to the package's bin folder.
      
      It should look like this:
      "bin": {
        "${context.name}": "${context.indexFilePath}"
      }`,
    }),

    ...runNpmCommandComposer({
      stateName: "install",
      nextStateName: "verifyDone",
      command: `install`,
    }),

    ...promptAgentComposer<AddCommandWorkflowContext>({
      stateName: "verifyDone",
      nextStateName: "done",
      promptForContext: ({ context }) =>
        `Run the command \`npm exec ${context.name} help\` to verify that the command is working correctly.
      
      Run \`npm exec ${context.name}\` and it should display help information without errors.`,
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
      exampleValue: "example-command",
    },
  ];
  sourceUrl = import.meta.url;
}
