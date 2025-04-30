import { SimpleWorkflow } from "@saflib/workflows";

export interface AddWorkflowParams {
  workflowName: string;
  description: string;
}

interface AddWorkflowData {}

export class AddWorkflow extends SimpleWorkflow<
  AddWorkflowParams,
  AddWorkflowData
> {
  name = "add-workflow";
  description = "Helps create a new workflow definition.";
  cliArguments = [
    {
      name: "workflowName",
      description:
        "The name of the new workflow to create (e.g., 'refactor-component')",
    },
    {
      name: "description",
      description: "The description for the new workflow.",
    },
  ];
  init = async (workflowName: string, description: string) => {
    this.params = { workflowName, description };
    return { data: {} };
  };

  workflowPrompt = () =>
    `You are creating a new workflow named '${this.getParams().workflowName}'.`;

  steps = [
    {
      name: "Create Workflow File",
      prompt: () =>
        `Create the basic workflow file for '${this.getParams().workflowName}'. It should be located in the appropriate directory within 'saflib/workflows/' (e.g., 'sample/' or a new directory) and include the basic structure (imports, class definition, name, description, cliArguments, init, workflowPrompt, empty steps array).`,
    },
    {
      name: "Export Workflow",
      prompt: () =>
        `Now, ensure the new workflow '${this.getParams().workflowName}' is exported correctly. 
        1. Create or update an 'index.ts' file in the same directory as the new workflow file.
        2. Import the new workflow class into 'index.ts'.
        3. Add an instance of the new workflow to the default exported array in 'index.ts'.
        4. Update the package.json of the package containing the workflow (e.g., '@saflib/workflows') to include a './workflows' export pointing to this 'index.ts' file.`,
    },
    {
      name: "Ensure Dependency",
      prompt: () =>
        `Verify that the package containing the new workflow (e.g., '@saflib/workflows') is listed as a dependency in the 'tools/workflows/package.json' file. If it's not present, add it and run 'npm install'.`,
    },
  ];
}
