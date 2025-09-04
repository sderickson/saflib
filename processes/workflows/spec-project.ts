import {
  CopyTemplateMachine,
  PromptStepMachine,
  CommandStepMachine,
  makeWorkflowMachine,
  step,
  XStateWorkflow,
} from "@saflib/workflows";
import path from "path";
import { kebabCaseToPascalCase } from "@saflib/utils";

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
  pascalName: string;
  targetDir: string;
  safDocOutput: string;
  safWorkflowHelpOutput: string;
}

export const SpecProjectWorkflowMachine = makeWorkflowMachine<
  SpecProjectWorkflowContext,
  typeof input
>({
  id: "spec-project",

  description: "Write a product/technical specification for a project.",

  input,

  context: ({ input }) => {
    const date = new Date().toISOString().split("T")[0];
    const projectDirName = `${date}-${input.name}`;
    const targetDir = path.resolve(process.cwd(), projectDirName);

    return {
      name: input.name,
      pascalName: kebabCaseToPascalCase(input.name),
      targetDir,
      safDocOutput: "",
      safWorkflowHelpOutput: "",
    };
  },

  templateFiles: {
    spec: path.join(sourceDir, "template-file.spec.md"),
    checklist: path.join(sourceDir, "template-file.checklist.md"),
  },

  docFiles: {},

  steps: [
    step(CopyTemplateMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `The following packages are available in this monorepo. You can learn more about any given package by running \`npm exec saf-doc <package-name>\`.

${context.safDocOutput}`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `You are writing a product/technical specification for ${context.name}. Ask for an overview of the project if you haven't already gotten one, then given that description, fill the spec.md file which was just created.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Go back and forth with the human on the spec. Have the human make updates and notes in the doc, then review their changes, make your own updates, and repeat until they sign off.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Before creating the checklist, please review the guide on writing spec project checklists located at writing-spec-project-checklists.md. This will help you create a proper implementation checklist with the correct format, workflow commands, and paths. Once you've reviewed the guide, run "npm exec saf-workflow next" to continue.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-workflow", "kickoff", "help"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `See the above list of available workflow commands. Please fill out the checklist.md file with these commands and arguments.`,
    })),
  ],
});

export class SpecProjectWorkflow extends XStateWorkflow {
  machine = SpecProjectWorkflowMachine;
  description = SpecProjectWorkflowMachine.definition.description || "";
  cliArguments = [
    {
      name: "name",
      description:
        "kebab-case name of project to use in folder and git branch names and alike",
      exampleValue: "example-project",
    },
  ];
  sourceUrl = import.meta.url;
}
