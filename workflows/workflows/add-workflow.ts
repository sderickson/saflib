import {
  CopyStepMachine,
  UpdateStepMachine,
  step,
  defineWorkflow,
  getPackageName,
  makeLineReplace,
  CommandStepMachine,
  CdStepMachine,
  type ParsePackageNameOutput,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
} from "@saflib/workflows";
import path from "node:path";
import { packageStubRoot } from "@saflib/templates";

const sourceDir = path.join(packageStubRoot, "workflows");
const workflowsCliDir = path.resolve(import.meta.dirname, "../../workflows-cli");
const workflowsCliListTemplate = path.join(
  import.meta.dirname,
  "templates/list.ts",
);

const input = [
  {
    name: "name",
    description:
      "The name of the new workflow to create (e.g., 'refactor-component')",
    exampleValue: "example-package/example-workflow",
  },
] as const;

interface AddWorkflowContext extends ParsePackageNameOutput, ParsePathOutput {
  workflowNamespace: string;
  workflowPackageName: string;
  name: string;
}

export const AddWorkflowDefinition = defineWorkflow<
  typeof input,
  AddWorkflowContext
>({
  id: "workflows/add-workflow",

  description:
    "Create a new workflow and adds it to the CLI tool. Stops after setup to wait for implementation requirements.",

  checklistDescription: ({ workflowNamespace, targetName }) =>
    `Add ${workflowNamespace}/${targetName} to the CLI tool.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    if (!input.name.includes("/")) {
      throw new Error("Workflow name must include a slash (namespace)");
    }
    const [workflowNamespace, targetName] = input.name.split("/");
    const workflowPath = `./workflows/${targetName}.ts`;

    const context = {
      ...parsePackageName(getPackageName(input.cwd)),
      ...parsePath(workflowPath, {
        requiredSuffix: ".ts",
        requiredPrefix: "./workflows/",
        cwd: input.cwd,
      }),
      workflowNamespace,
      workflowPackageName: "@saflib/workflows",
      name: input.name,
    };

    return context;
  },

  templateFiles: {
    workflow: path.join(sourceDir, "__target-name__.ts"),
    test: path.join(sourceDir, "__target-name__.test.ts"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {
    readme: path.join(import.meta.dirname, "../docs/README.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, () => ({
      fileId: "workflow",
      promptMessage: `Update the workflow file to implement the main functionality. Replace any TODO comments with actual implementation.`,
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: workflowsCliDir,
      templateFiles: {
        list: workflowsCliListTemplate,
      },
      lineReplace: makeLineReplace(context),
    })),

    step(CdStepMachine, () => ({
      cwd: workflowsCliDir,
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: ["install", context.packageName],
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: ["exec", "saf-workflow", "checklist", context.name],
    })),
  ],
});
