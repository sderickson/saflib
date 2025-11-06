import {
  CopyStepMachine,
  PromptStepMachine,
  step,
  defineWorkflow,
  CommandStepMachine,
  getPackageName,
  makeLineReplace,
  UpdateStepMachine,
  type ParsePackageNameOutput,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

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

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Create template files for ${context.targetName} workflow.

      Create a folder named \`templates\` next to the workflow file if it doesn't already exist. Add any template files you need to the folder. Make sure the organization of those template files matches the organization recommended by the package. Check if you're not sure how to organize them. And if you don't have them already, ask for samples to base the template files on.

      **Important**: Use "__target-name__" as the base name in your template files (not {{...}} placeholders). The system will automatically replace "__target-name__", "__target_name__", "__TargetName__", and "__targetName__" with the actual name during workflow execution. This keeps template files valid TypeScript/JavaScript.

      This goes for file names as well. You may well create a file named \`__target-name__.ts\` or something like that and it will get renamed based on the name passed into \`CopyStepMachine\`.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "workflow",
      promptMessage: `Update the workflow file to implement the main functionality. Replace any TODO comments with actual implementation.

      Please review the following documentation first:
      - Overview: ${context.docFiles?.overview}`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Export **${context.targetName}** from **${context.packageName}**.
        1. An adjacent 'index.ts' file should already exist, check that it does.
        2. Import the new workflow class into 'workflows/index.ts' if it's not already there.
        3. Add the new workflow *class* (not an instance) to the default exported array in 'workflows/index.ts'.
        4. If needed, update the package.json of this package (${context.packageName}) to include a './workflows' export pointing to the 'workflows/index.ts' file.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add \`${context.packageName}\`'s exported workflows to the CLI tool.

      * Look for the string "workflows/add-workflow HOOK", a file named "workflow-cli.ts", or a package which depends on @saflib/workflows that seems promising.
      * If not already included, install \`${context.packageName}\` as a dependency of the package that contains that file you found, and add the exported workflows to the list.
      * Check that it works by running "npm exec saf-workflow checklist ${context.name}"`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});
