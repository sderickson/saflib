import {
  CopyStepMachine,
  defineWorkflow,
  step,
  UpdateStepMachine,
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

export interface SpecProjectWorkflowContext {
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

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "spec",
      promptMessage: `Update **${path.basename(context.copiedFiles!.spec)}**.`,
    })),
  ],
});
