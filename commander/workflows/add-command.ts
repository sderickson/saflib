import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
} from "@saflib/workflows";
import path, { dirname } from "node:path";
import { kebabCaseToPascalCase } from "@saflib/utils";
import { existsSync } from "node:fs";

const sourceDir = path.join(import.meta.dirname, "templates");

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

export const AddCommandWorkflowDefinition = defineWorkflow<
  typeof input,
  AddCommandWorkflowContext
>({
  id: "commander/add-command",

  description:
    "Create a new CLI command and add it to an existing Commander.js CLI",

  checklistDescription: ({ name, cliName }) => `Add ${name} to ${cliName} CLI.`,

  input,

  sourceUrl: import.meta.url,

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

    if (input.runMode !== "dry" && !existsSync(targetDir)) {
      throw new Error(`Target directory ${targetDir} does not exist`);
    }

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
    command: path.join(sourceDir, "template-file.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "command",
      promptMessage: `Update **${path.basename(context.copiedFiles!.command)}**, resolving any TODOs.`,
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

    step(PromptStepMachine, () => ({
      promptText: `Implement the new command.
      
      Ask for implementation details if it's unclear what to implement or how to do it.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/dev-tools", "--save-dev"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-docs", "generate"],
    })),
  ],
});
