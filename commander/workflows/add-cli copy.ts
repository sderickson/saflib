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

interface AddCLIWorkflowInput extends WorkflowInput {
  name: string;
}

interface AddCLIWorkflowContext extends TemplateWorkflowContext {
  cliName: string;
  indexFilePath: string;
}

export const AddCLIWorkflowMachine = setup({
  types: {
    input: {} as AddCLIWorkflowInput,
    context: {} as AddCLIWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "add-cli",

  initial: "copyTemplate",

  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "add-cli");

    // The target directory will be bin/{input.name}
    const targetDir = path.join("./bin", input.name);
    const indexFilePath = path.join(targetDir, "index.ts");

    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      cliName: input.name,
      sourceDir,
      targetDir,
      indexFilePath,
      ...contextFromInput(input),
    };
  },

  entry: logInfo("Successfully began add-cli workflow"),

  states: {
    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "updateIndexFile",
    }),

    ...updateTemplateComposer<AddCLIWorkflowContext>({
      stateName: "updateIndexFile",
      nextStateName: "makeIndexExecutable",
      filePath: (context) => context.indexFilePath,
      promptMessage: (context) =>
        `Please update ${context.indexFilePath}, resolving any TODOs.`,
    }),

    ...promptAgentComposer<AddCLIWorkflowContext>({
      stateName: "makeIndexExecutable",
      nextStateName: "addToBin",
      promptForContext: ({ context }) =>
        `Run the command \`chmod +x ${context.indexFilePath}\` to make the index file executable.`,
    }),

    ...promptAgentComposer<AddCLIWorkflowContext>({
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

    ...promptAgentComposer<AddCLIWorkflowContext>({
      stateName: "verifyDone",
      nextStateName: "done",
      promptForContext: ({ context }) =>
        `Run the command \`npm exec ${context.name}\` to verify that the cli is working correctly.
      
      Run \`npm exec ${context.name}\` and it should display help information without errors.`,
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class AddCLIWorkflow extends XStateWorkflow {
  machine = AddCLIWorkflowMachine;
  description =
    "Creates a new CLI with Commander.js, accessible through npm exec";

  cliArguments = [
    {
      name: "name",
      description: "The name of the cli to create (e.g., 'build' or 'deploy')",
      exampleValue: "example-cli",
    },
  ];
  sourceUrl = import.meta.url;
}
