import {
  CopyStepMachine,
  defineWorkflow,
  step,
  UpdateStepMachine,
  PromptStepMachine,
  makeLineReplace,
} from "@saflib/workflows";
import path from "path";

/**
 * Todo:
 * - make sure api responses are flattened, without nested objects
 * - allow there to be multiple workflows, might need to make several based on the spec
 * - run a test where workflows will be run in packages that support them, often they don't cd correctly
 * - make sure schemas are implemented in the right order
 * - need a way to add a lib function, not just an export
 */

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
  targetName: string;
  targetDir: string;
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
      targetName: input.name,
      targetDir,
    };
  },

  templateFiles: {
    spec: path.join(sourceDir, "__target-name__.spec.md"),
    workflow: path.join(sourceDir, "__target-name__.workflow.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "spec",
      promptMessage: `Update **${path.basename(context.copiedFiles!.spec)}**.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Check with the user that the spec is complete and correct.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "workflow",
      promptMessage: `Update **${path.basename(context.copiedFiles!.workflow)}**.
      
      To see what workflows there are available, run \`npm exec saf-workflow list\`.`,
    })),
  ],
});
