import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  parsePath,
  type ParsePathOutput,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "Relative path to the new command file, e.g. bin/cli-name/command-name.ts",
    exampleValue: "bin/example-cli/example-command.ts",
  },
] as const;

interface AddCommandWorkflowContext extends ParsePathOutput {}

export const AddCommandWorkflowDefinition = defineWorkflow<
  typeof input,
  AddCommandWorkflowContext
>({
  id: "commander/add-command",

  description:
    "Create a new CLI command and add it to an existing Commander.js CLI",

  checklistDescription: ({ targetName, groupName }) =>
    `Add ${targetName} to ${groupName} CLI.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePath(input.path, {
        requiredPrefix: "./bin/",
        requiredSuffix: ".ts",
        cwd: input.cwd,
      }),
    };
  },

  templateFiles: {
    command: path.join(sourceDir, "bin/__group-name__/__target-name__.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "command",
      promptMessage: `Update **${path.basename(context.copiedFiles!.command)}**
      
      Full path: ${context.copiedFiles!.command}
      
      Implement the command functionality.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add the new command to the adjacent index.ts file.
      
      * Import the command function from ${context.copiedFiles!.command}
      * Add it to the program before \`program.parse\` is called.
      
      Test the command was added correctly by running:
      npm exec ${context.groupName} ${context.targetName}`,
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
