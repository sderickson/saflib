import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  XStateWorkflow,
  copyTemplateStateComposer,
  updateTemplateComposer,
  promptAgentComposer,
  type TemplateWorkflowContext,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
} from "@saflib/workflows";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { kebabCaseToPascalCase } from "@saflib/utils";

interface AddCommandWorkflowInput extends WorkflowInput {
  path: string;
}

interface AddCommandWorkflowContext extends TemplateWorkflowContext {
  cliName: string;
  commandFunctionName: string;
  commandFilePath: string;
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

    // validate inputs
    const parts = input.path
      .split("/")
      .filter((part) => part !== "" && part !== ".");
    if (
      parts.length < 3 ||
      parts[0] !== "bin" ||
      !parts[parts.length - 1].includes(".ts")
    ) {
      throw new Error(
        "Path should be of the form bin/{cli-name}/{command-name}.ts",
      );
    }

    const targetDir = dirname(input.path);
    const commandFilePath = input.path;
    const cliName = parts[1];
    const commandName = parts[parts.length - 1].replace(".ts", "");
    const commandFunctionName = `add${kebabCaseToPascalCase(commandName)}Command`;

    return {
      name: commandName,
      pascalName: kebabCaseToPascalCase(commandName),
      cliName,
      commandFunctionName,
      sourceDir,
      targetDir,
      commandFilePath,
      ...contextFromInput(input),
    };
  },

  entry: logInfo("Successfully began add-command workflow"),

  states: {
    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "updateTemplate",
    }),

    ...updateTemplateComposer<AddCommandWorkflowContext>({
      stateName: "updateTemplate",
      nextStateName: "addToIndex",
      filePath: (context) => context.commandFilePath,
      promptMessage: (context) =>
        `Please update ${context.commandFilePath}, resolving any TODOs.`,
    }),

    ...promptAgentComposer<AddCommandWorkflowContext>({
      stateName: "addToIndex",
      nextStateName: "testCommand",
      promptForContext: ({ context }) =>
        `Add the new command to the main index.ts file.
      
      Import the command function:
      import { ${context.commandFunctionName} } from "./${context.name}.ts";
      
      Add it to the program before \`program.parse\` is called:
      ${context.commandFunctionName}(program);`,
    }),

    ...promptAgentComposer<AddCommandWorkflowContext>({
      stateName: "testCommand",
      nextStateName: "done",
      promptForContext: ({ context }) =>
        `Test the new command by running:
      
      npm exec ${context.cliName} ${context.name}
      
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
    "Creates a new CLI command and adds it to an existing Commander.js CLI";

  cliArguments = [
    {
      name: "path",
      description:
        "Relative path to the new command file, e.g. bin/cli-name/command-name.ts",
      exampleValue: "bin/example-cli/example-command.ts",
    },
  ];
  sourceUrl = import.meta.url;
}
