import {
  CopyStepMachine,
  PromptStepMachine,
  step,
  defineWorkflow,
  DocStepMachine,
  CommandStepMachine,
} from "../core/index.ts";
import { readFileSync } from "fs";
import path from "node:path";
import { existsSync } from "node:fs";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "The name of the new workflow to create (e.g., 'refactor-component')",
    exampleValue: "example-workflow",
  },
] as const;

interface AddWorkflowContext {
  workflowName: string;
  workflowPath: string;
  workflowPackageName: string;
  packageName: string;
  targetDir: string;
  namespace: string;
}

export const AddWorkflowDefinition = defineWorkflow<
  typeof input,
  AddWorkflowContext
>({
  id: "workflows/add-workflow",

  description:
    "Create a new workflow and adds it to the CLI tool. Stops after setup to wait for implementation requirements.",

  checklistDescription: ({ workflowName }) =>
    `Add ${workflowName} to the CLI tool.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    if (!input.name.includes("/")) {
      throw new Error("Workflow name must include a slash (namespace)");
    }
    const [namespace, workflowName] = input.name.split("/");
    const workflowPath = `workflows/${workflowName}.ts`;
    let packageName =
      readFileSync(path.join(input.cwd, "package.json"), "utf8").match(
        /name": "(.+)"/,
      )?.[1] || "@your/target-package";
    if (input.runMode === "dry") {
      packageName = "@example/package";
    }
    const workflowPackageName = findWorkflowPackageName();

    const targetDir = input.cwd + "/workflows";

    return {
      workflowName,
      workflowPath,
      workflowPackageName,
      packageName,
      targetDir,
      namespace,
    };
  },

  templateFiles: {
    workflow: path.join(sourceDir, "template-file.ts"),
    test: path.join(sourceDir, "template-file.test.ts"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {
    readme: path.join(import.meta.dirname, "../docs/README.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => {
      return {
        name: context.workflowName,
        targetDir: context.targetDir,
        // Internal use uses @saflib/workflows, but published package uses saflib-workflows.
        // Adjust the produced workflow depending on what the name of the workflow package is.
        lineReplace: (line) =>
          line
            .replace("@saflib/workflows", context.workflowPackageName)
            .replace("template-namespace", context.namespace),
        runMode: context.runMode,
      };
    }),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add name, description, and cliArguments to the newly created ${context.workflowPath}.
      
      Don't worry about the other TODOs for now; currently we're just making sure the stub workflow is properly installed into the CLI tool.
      You should namespace the id, though. Make sure it starts with the name of the package (sans organization), e.g. workflows/add-workflow`,
      runMode: context.runMode,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Export **${context.workflowName}** from **${context.packageName}**.
        1. An adjacent 'index.ts' file should already exist, check that it does.
        2. Import the new workflow class into 'workflows/index.ts' if it's not already there.
        3. Add the new workflow *class* (not an instance) to the default exported array in 'workflows/index.ts'.
        4. If needed, update the package.json of this package (${context.packageName}) to include a './workflows' export pointing to the 'workflows/index.ts' file.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Find the file which gathers all workflows to include them in the saf-workflow CLI tool.

      Look for the string "workflows/add-workflow HOOK", a file named "workflow-cli.ts", or a package which depends on @saflib/workflows that seems promising.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `If needed, install \`${context.packageName}\` as a dependency of the package that contains that file you found.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add \`${context.packageName}\`'s exported workflows to the CLI file's list of workflows.
        1. Import the workflow array exported from the package (e.g., \`import newWorkflows from '${context.packageName}/workflows';\`). Make sure to use the correct package name.
        2. Add the imported workflows to the \`workflowClasses\` array. You can use the spread operator (\`...newWorkflows\`) for this.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Check that the new workflow appears in the saf-workflow CLI tool.

      Run the command \`npm exec saf-workflow help kickoff\` in your terminal (any directory). Ensure that your new workflow "${context.workflowName}" appears in the list.`,
    })),

    step(DocStepMachine, () => ({
      docId: "readme",
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Create template files for ${context.workflowName} workflow.

      Create a folder named \`templates\` next to the workflow file if it doesn't already exist. Add any template files you need to the folder. Make sure the organization of those template files matches the organization recommended by the package. Check if you're not sure how to organize them. And if you don't have them already, ask for samples to base the template files on.

      **Important**: Use "template-file" as the base name in your template files (not {{...}} placeholders). The system will automatically replace "template-file", "template_file", "TemplateFile", and "templateFile" with the actual name during workflow execution. This keeps template files valid TypeScript/JavaScript.

      This goes for file names as well. You may well create a file named \`template-file.ts\` or something like that and it will get renamed based on the name passed into \`CopyStepMachine\`.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npx",
      args: ["tsc", "--noEmit"],
      skipIf: async ({ cwd }) => !existsSync(path.join(cwd, "tsconfig.json")),
    })),

    step(PromptStepMachine, () => ({
      promptText: `Add documentation links to the workflow.

      A good workflow is one with documentation to guide development. If you have not already been provided with documentation, ask for it.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add steps to ${context.workflowPath}.

      The steps will normally include:
      1. First copying the template files
      2. Then updating each template file that has TODOs in it.
      3. Reviewing documents at key points.
      4. Running tests and other scripts at key points.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Review the checklist and verify that the workflow was added correctly.

      Run \`npm exec saf-workflow checklist ${context.workflowName}\` to see the checklist.`,
    })),
  ],
});

const findWorkflowPackageName = () => {
  let workflowPackageName = "@saflib/workflows";
  let currentDir = import.meta.dirname;
  while (currentDir !== "/") {
    const packageJsonFileName = path.join(currentDir, "package.json");
    if (existsSync(packageJsonFileName)) {
      workflowPackageName = JSON.parse(
        readFileSync(packageJsonFileName, "utf8"),
      ).name;
      break;
    }
    currentDir = path.dirname(currentDir);
  }
  return workflowPackageName;
};
