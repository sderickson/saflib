import {
  CopyStepMachine,
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "path";

const sourceDir = path.resolve(import.meta.dirname, "./templates");

const input = [
  {
    name: "name",
    description:
      "kebab-case name of project to use in folder and git branch names and alike",
    exampleValue: "example-project",
  },
] as const;

interface SpecProjectWorkflowContext {
  name: string;
  targetDir: string;
  safDocOutput: string;
  safWorkflowHelpOutput: string;
}

export const SpecProjectWorkflowDefinition = defineWorkflow<
  typeof input,
  SpecProjectWorkflowContext
>({
  id: "processes/spec-project",

  description: "Write a product/technical specification for a project.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const date = new Date().toISOString().split("T")[0];
    const projectDirName = `${date}-${input.name}`;
    const targetDir = path.resolve(input.cwd, "notes", projectDirName);

    return {
      name: input.name,
      targetDir,
      safDocOutput: "",
      safWorkflowHelpOutput: "",
    };
  },

  templateFiles: {
    spec: path.join(sourceDir, "template-file.spec.md"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-docs", "print"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `Get familiar with the SAF packages available to you above. For more information about any given package, run \`npm exec saf-docs <package-name>\`.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `You are writing a product/technical specification for ${context.name}. Ask for an overview of the project if you haven't already gotten one, then given that description, fill the spec.md file which was just created.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Discuss and iterate on the spec until it's approved.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-workflow", "list", "--", "-ad"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `See the above list of available workflow commands. Please fill out the checklist.md file with these commands and arguments.`,
    })),
  ],
});
