import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "add-cli");

const input = [
  {
    name: "name",
    description: "The name of the cli to create (e.g., 'build' or 'deploy')",
    exampleValue: "example-cli",
  },
] as const;

interface AddCLIWorkflowContext {
  name: string;
  pascalName: string;
  cliName: string;
  targetDir: string;
  indexFilePath: string;
}

export const AddCLIWorkflowDefinition = defineWorkflow<
  typeof input,
  AddCLIWorkflowContext
>({
  id: "add-cli",

  description:
    "Creates a new CLI with Commander.js, accessible through npm exec",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    // The target directory will be bin/{input.name}
    const targetDir = path.join("./bin", input.name);
    const indexFilePath = path.join(targetDir, "index.ts");

    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      cliName: input.name,
      targetDir,
      indexFilePath,
    };
  },

  templateFiles: {
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "index",
      promptMessage: `Update **${path.basename(context.copiedFiles!.index)}**, resolving any TODOs.`,
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "chmod",
      args: ["+x", context.indexFilePath],
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add ${context.indexFilePath} to the package's bin folder.
      
      It should look like this:
      "bin": {
        "${context.name}": "${context.indexFilePath}"
      }`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Run the command \`npm exec ${context.name}\` to verify that the cli is working correctly.
      
      Run \`npm exec ${context.name}\` and it should display help information without errors.`,
    })),
  ],
});
