import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  XStateWorkflow,
  promptAgentComposer,
  copyTemplateStateComposer,
  type TemplateWorkflowContext,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
} from "@saflib/workflows";
import { getSafReporters } from "@saflib/node";
import { kebabCaseToPascalCase } from "@saflib/utils";
import { readFileSync } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddWorkflowInput extends WorkflowInput {
  name: string;
}

interface AddWorkflowContext extends TemplateWorkflowContext {
  workflowName: string;
  workflowPath: string;
  packageName: string;
}

export const AddWorkflowMachine = setup({
  types: {
    input: {} as AddWorkflowInput,
    context: {} as AddWorkflowContext,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
}).createMachine({
  id: "add-workflow",
  initial: "initialize",
  context: ({ input }) => {
    const workflowName = input.name || "";
    const workflowPath = `workflows/${workflowName}.ts`;
    const packageName = input.dryRun
      ? "@your/target-package"
      : readFileSync("package.json", "utf8").match(/name": "(.+)"/)?.[1] || "";

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "add-workflow.templates");
    const targetDir = process.cwd() + "/workflows";

    return {
      workflowName,
      workflowPath,
      packageName,
      name: workflowName,
      pascalName: kebabCaseToPascalCase(workflowName),
      sourceDir,
      targetDir,
      ...contextFromInput(input),
    };
  },
  entry: () => {
    const { log } = getSafReporters();
    log.info("Successfully began add-workflow");
  },
  states: {
    // First copy over the template files
    ...copyTemplateStateComposer({
      stateName: "initialize",
      nextStateName: "updateWorkflowFile",
    }),

    ...promptAgentComposer<AddWorkflowContext>({
      stateName: "updateWorkflowFile",
      nextStateName: "exportWorkflow",
      promptForContext: ({ context }) =>
        `Add name, description, and cliArguments to the newly created ${context.workflowPath}.
      
      Don't worry about the other TODOs for now; currently we're just making sure the stub workflow is properly installed into the CLI tool.`,
    }),

    ...promptAgentComposer<AddWorkflowContext>({
      stateName: "exportWorkflow",
      nextStateName: "ensureDependency",
      promptForContext: ({ context }) =>
        `Export **${context.workflowName}** from **${context.packageName}**. 
        1. An adjacent 'index.ts' file should already exist, check that it does.
        2. Import the new workflow class into 'workflows/index.ts' if it's not already there.
        3. Add the new workflow *class* (not an instance) to the default exported array in 'workflows/index.ts'.
        4. If needed, update the package.json of this package (${context.packageName}) to include a './workflows' export pointing to the 'workflows/index.ts' file.`,
    }),

    // TODO: Change to use runNpmCommandFactory
    ...promptAgentComposer<AddWorkflowContext>({
      stateName: "ensureDependency",
      nextStateName: "updateWorkflowList",
      promptForContext: ({ context }) =>
        `Add \`${context.packageName}\` as a dependency of \`@saflib/workflows-cli\`.
      
       If it's not a dependency in \`'saflib/workflows-cli/package.json'\`, go to that directory and run \`npm install ${context.packageName}\`.`,
    }),

    ...promptAgentComposer<AddWorkflowContext>({
      stateName: "updateWorkflowList",
      nextStateName: "verifyWorkflowList",
      promptForContext: ({ context }) =>
        `Add \`${context.packageName}\` to \`@saflib/workflows-cli\`'s list of workflows. 
        1. Import the workflow array exported from the package (e.g., \`import newWorkflows from '${context.packageName}/workflows';\`). Make sure to use the correct package name.
        2. Add the imported workflows to the \`workflowClasses\` array. You can use the spread operator (\`...newWorkflows\`) for this.`,
    }),

    // TODO: Automate this; doesn't need to be a prompt
    ...promptAgentComposer<AddWorkflowContext>({
      stateName: "verifyWorkflowList",
      nextStateName: "done",
      promptForContext: ({ context }) =>
        `Check that the new workflow appears in the saf-workflow CLI tool.
      
      Run the command \`npm exec saf-workflow kickoff help\` in your terminal (any directory). Ensure that your new workflow "${context.workflowName}" appears in the list.`,
    }),

    done: {
      type: "final",
    },
  },

  output: outputFromContext,
});

export class AddWorkflow extends XStateWorkflow {
  machine = AddWorkflowMachine;
  description =
    "Create a new workflow and adds it to the CLI tool. Does not currently implement the workflow.";
  cliArguments = [
    {
      name: "name",
      description:
        "The name of the new workflow to create (e.g., 'refactor-component')",
      exampleValue: "example-workflow",
    },
  ];
  sourceUrl = import.meta.url;
}
