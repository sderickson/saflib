import { setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  XStateWorkflow,
  promptAgentFactory,
  copyTemplateStateFactory,
  type TemplateWorkflowContext,
  contextFromInput,
  type WorkflowInput,
} from "@saflib/workflows";
import { getSafReporters } from "@saflib/node";
import { kebabCaseToPascalCase } from "../src/utils.ts";
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
    ...workflowActionImplementations,
  },
  actors: {
    ...workflowActors,
  },
}).createMachine({
  id: "add-workflow",
  description: "Create a new workflow",
  initial: "initialize",
  context: ({ input }) => {
    const workflowName = input.name || "";
    const workflowPath = `workflows/${workflowName}.ts`;
    const packageName =
      readFileSync("package.json", "utf8").match(/name": "(.+)"/)?.[1] || "";

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
    ...copyTemplateStateFactory({
      stateName: "initialize",
      nextStateName: "updateWorkflowFile",
    }),

    ...promptAgentFactory<AddWorkflowContext>({
      stateName: "updateWorkflowFile",
      nextStateName: "exportWorkflow",
      promptForContext: ({ context }) =>
        `You are creating a new workflow named '${context.workflowName}'.

The file '${context.workflowPath}' has been created. Fill in the TODOs (name and description), then review the file to get oriented. Do NOT work on the machine itself yet.`,
    }),

    ...promptAgentFactory<AddWorkflowContext>({
      stateName: "exportWorkflow",
      nextStateName: "ensureDependency",
      promptForContext: ({ context }) =>
        `Ensure the new workflow '${context.workflowName}' is exported correctly. 
        1. An adjacent 'index.ts' file should already exist, check that it does.
        2. Import the new workflow class into 'workflows/index.ts' if it's not already there.
        3. Add the new workflow *class* (not an instance) to the default exported array in 'workflows/index.ts'.
        4. If needed, update the package.json of this package (${context.packageName}) to include a './workflows' export pointing to the 'workflows/index.ts' file.
        5. And! If you do include a './workflows' export, you might need to make the value of "main" be a "." export.`,
    }),

    ...promptAgentFactory<AddWorkflowContext>({
      stateName: "ensureDependency",
      nextStateName: "updateWorkflowList",
      promptForContext: ({ context }) =>
        `Verify that '"${context.packageName}": "*"' is a dependency in the 'tools/workflows/package.json' file. If it's not present, add it and run 'npm install'.`,
    }),

    ...promptAgentFactory<AddWorkflowContext>({
      stateName: "updateWorkflowList",
      nextStateName: "verifyWorkflowList",
      promptForContext: ({ context }) =>
        `Finally, update 'tools/workflows/list.ts'. 
        1. Import the workflow array exported from the package (e.g., \`import newWorkflows from '${context.packageName}/workflows';\`). Make sure to use the correct package name.
        2. Add the imported workflows to the \`workflowClasses\` array. You can use the spread operator (\`...newWorkflows\`) for this.`,
    }),

    ...promptAgentFactory<AddWorkflowContext>({
      stateName: "verifyWorkflowList",
      nextStateName: "done",
      promptForContext: ({ context }) =>
        `As a final check, run the command \`npm exec saf-workflow kickoff help\` in your terminal (any directory). Ensure that your new workflow "${context.workflowName}" appears in the list.`,
    }),

    done: {
      type: "final",
    },
  },
});

export class AddWorkflow extends XStateWorkflow {
  machine = AddWorkflowMachine;
  description = "Create a new workflow";
  cliArguments = [
    {
      name: "name",
      description:
        "The name of the new workflow to create (e.g., 'refactor-component')",
    },
  ];
  sourceUrl = import.meta.url;
}
