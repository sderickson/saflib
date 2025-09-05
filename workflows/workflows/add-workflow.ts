import {
  CopyStepMachine,
  PromptStepMachine,
  step,
  defineWorkflow,
} from "@saflib/workflows";
import { readFileSync } from "fs";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "add-workflow.templates");

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
  packageName: string;
  targetDir: string;
}

export const AddWorkflowDefinition = defineWorkflow<
  typeof input,
  AddWorkflowContext
>({
  id: "add-workflow",

  description:
    "Create a new workflow and adds it to the CLI tool. Stops after setup to wait for implementation requirements.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const workflowName = input.name || "";
    const workflowPath = `workflows/${workflowName}.ts`;
    const packageName =
      readFileSync("package.json", "utf8").match(/name": "(.+)"/)?.[1] ||
      "@your/target-package";
    const targetDir = process.cwd() + "/workflows";

    return {
      workflowName,
      workflowPath,
      packageName,
      targetDir,
    };
  },

  templateFiles: {
    workflow: path.join(sourceDir, "template-file.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.workflowName,
      targetDir: context.targetDir,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add name, description, and cliArguments to the newly created ${context.workflowPath}.
      
      Don't worry about the other TODOs for now; currently we're just making sure the stub workflow is properly installed into the CLI tool.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Export **${context.workflowName}** from **${context.packageName}**. 
        1. An adjacent 'index.ts' file should already exist, check that it does.
        2. Import the new workflow class into 'workflows/index.ts' if it's not already there.
        3. Add the new workflow *class* (not an instance) to the default exported array in 'workflows/index.ts'.
        4. If needed, update the package.json of this package (${context.packageName}) to include a './workflows' export pointing to the 'workflows/index.ts' file.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add \`${context.packageName}\` as a dependency of \`@saflib/workflows-cli\`.
      
       If it's not a dependency in \`'saflib/workflows-cli/package.json'\`, go to that directory and run \`npm install ${context.packageName}\`.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add \`${context.packageName}\` to \`@saflib/workflows-cli\`'s list of workflows. 
        1. Import the workflow array exported from the package (e.g., \`import newWorkflows from '${context.packageName}/workflows';\`). Make sure to use the correct package name.
        2. Add the imported workflows to the \`workflowClasses\` array. You can use the spread operator (\`...newWorkflows\`) for this.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Check that the new workflow appears in the saf-workflow CLI tool.
      
      Run the command \`npm exec saf-workflow kickoff help\` in your terminal (any directory). Ensure that your new workflow "${context.workflowName}" appears in the list.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Stop and understand the workflow requirements before proceeding.

      If you don't know the answers to any of the following, ask the person giving the task:
      1. What should this workflow do?
      2. What template files should it create?
      3. What should the workflow steps be?
      4. Any specific requirements or constraints?
      `,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Create template files for ${context.workflowName} workflow.

      Create a folder named \`${context.workflowName}\` next to the workflow file. Add any template files you need to the folder.
      If you don't have them already, ask for samples to base the template files on.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Implement the workflow logic in ${context.workflowPath}.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Review the checklist and verify that the workflow was added correctly.
      
      Run \`npm exec saf-workflow checklist ${context.workflowName}\` to see the checklist.`,
    })),
  ],
});

// export class AddWorkflow extends XStateWorkflowRunner {
//   machine = AddWorkflowMachine;
//   description = AddWorkflowMachine.definition.description || "";
//   cliArguments = input;
//   sourceUrl = import.meta.url;
// }
