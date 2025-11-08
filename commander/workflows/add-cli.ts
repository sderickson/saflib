import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  type ParsePathOutput,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description: "The name of the cli to create (e.g., 'build' or 'deploy')",
    exampleValue: "example-cli",
  },
] as const;

interface AddCLIWorkflowContext extends ParsePathOutput {}

export const AddCLIWorkflowDefinition = defineWorkflow<
  typeof input,
  AddCLIWorkflowContext
>({
  id: "commander/add-cli",

  description:
    "Create  a new CLI with Commander.js, accessible through npm exec",

  checklistDescription: ({ groupName }) =>
    `Create a new CLI called ${groupName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, "bin", input.name);
    return {
      targetDir,
      groupName: input.name,
      targetName: input.name,
    };
  },

  templateFiles: {
    index: path.join(sourceDir, "bin/__group-name__/index.ts"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["./package.json"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.groupName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "index",
      promptMessage: `Update **${path.basename(context.copiedFiles!.index)}**, resolving any TODOs.`,
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "chmod",
      args: ["+x", context.copiedFiles!.index],
    })),

    step(PromptStepMachine, ({ context }) => {
      const relativePath = path.relative(
        context.cwd,
        context.copiedFiles!.index
      );
      return {
        promptText: `Add ${relativePath} to the package's bin folder.
        
        It should look like this:
        "bin": {
          "${context.groupName}": "${relativePath}"
        }`,
      };
    }),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/commander"],
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Run the command \`npm exec ${context.groupName}\` to verify that the cli is working correctly.
      
      Run \`npm exec ${context.groupName}\` and it should display help information without errors.`,
    })),
  ],
});
