import {
  CopyTemplateMachine,
  UpdateStepMachine,
  PromptStepMachine,
  makeWorkflowMachine,
  step,
  XStateWorkflow,
} from "@saflib/workflows";
import path, { dirname } from "node:path";
import { kebabCaseToPascalCase } from "@saflib/utils";

const sourceDir = path.join(import.meta.dirname, "add-command");

const input = [
  {
    name: "path",
    description:
      "Relative path to the new command file, e.g. bin/cli-name/command-name.ts",
    exampleValue: "bin/example-cli/example-command.ts",
  },
] as const;

interface AddCommandWorkflowContext {
  name: string;
  cliName: string;
  commandFunctionName: string;
  targetDir: string;
}

export const AddCommandWorkflowMachine = makeWorkflowMachine<
  AddCommandWorkflowContext,
  typeof input
>({
  id: "add-command",

  description:
    "Creates a new CLI command and adds it to an existing Commander.js CLI",

  input,

  context: ({ input }) => {
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
    const cliName = parts[1];
    const commandName = parts[parts.length - 1].replace(".ts", "");
    const commandFunctionName = `add${kebabCaseToPascalCase(commandName)}Command`;

    return {
      name: commandName,
      cliName,
      commandFunctionName,
      targetDir,
    };
  },

  templateFiles: {
    index: path.join(sourceDir, "template-file.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyTemplateMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "index",
      promptMessage: `Update **${path.basename(context.copiedFiles!.index)}**, resolving any TODOs.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add the new command to the adjacent index.ts file.
      
      Import the command function:
      import { ${context.commandFunctionName} } from "./${context.name}.ts";
      
      Add it to the program before \`program.parse\` is called:
      ${context.commandFunctionName}(program);`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Test the new command.

      Run the following command:
      
      npm exec ${context.cliName} ${context.name}
      
      The command should display help information without errors.`,
    })),
  ],
});

export class AddCommandWorkflow extends XStateWorkflow {
  machine = AddCommandWorkflowMachine;
  description = AddCommandWorkflowMachine.definition.description || "";
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
