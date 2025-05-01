import { SimpleWorkflow } from "@saflib/workflows";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";
import { kebabCaseToPascalCase } from "../src/utils.ts";

export interface AddWorkflowParams {
  workflowName: string;
}

export class AddWorkflow extends SimpleWorkflow<AddWorkflowParams> {
  name = "add-workflow";
  description = "Create a new workflow";
  cliArguments = [
    {
      name: "name",
      description:
        "The name of the new workflow to create (e.g., 'refactor-component')",
    },
  ];
  init = async (workflowName: string) => {
    this.params = { workflowName };
    const data = this.computed();
    const toLog = [];
    execSync(`mkdir -p workflows`);
    toLog.push("Upserted workflows directory");

    if (!existsSync(data.workflowIndexPath)) {
      execSync(`touch ${data.workflowIndexPath}`);
      writeFileSync(
        data.workflowIndexPath,
        `import { ${data.pascalCaseWorkflowName}Workflow } from "./${workflowName}.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [${data.pascalCaseWorkflowName}Workflow];

export default workflowClasses;
`,
      );
      toLog.push("Created workflow index file");
    }

    execSync(`touch workflows/${workflowName}.ts`);
    const workflowTemplate = readFileSync(
      path.join(import.meta.dirname, "workflow.template.ts"),
      "utf8",
    );
    writeFileSync(
      `workflows/${workflowName}.ts`,
      workflowTemplate
        .replaceAll("todo", workflowName)
        .replaceAll("ToDo", data.pascalCaseWorkflowName),
    );
    toLog.push("Created stub file");

    this.print(toLog.map((l) => `✔ ${l}`).join("\n"));
    return { data: {} };
  };

  computed = () => {
    return {
      workflowPath: `workflows/${this.getParams().workflowName}.ts`,
      workflowIndexPath: `workflows/index.ts`,
      pascalCaseWorkflowName: kebabCaseToPascalCase(
        this.getParams().workflowName,
      ),
      packageName: readFileSync("package.json", "utf8").match(
        /name": "(.+)"/,
      )?.[1],
    };
  };

  workflowPrompt = () =>
    `You are creating a new workflow named '${this.getParams().workflowName}'.`;

  steps = [
    {
      name: "Update Workflow File",
      prompt: () =>
        `The file '${this.computed().workflowPath}' has been created. Have the human fill in the TODOs, then review the file to get oriented. Ask questions if anything is unclear.`,
    },
    {
      name: "Export Workflow",
      prompt: () =>
        `Ensure the new workflow '${this.getParams().workflowName}' is exported correctly. 
        1. An adjacent 'index.ts' file should already exist, check that it does.
        2. Import the new workflow class into 'workflows/index.ts' if it's not already there.
        3. Add the new workflow *class* (not an instance) to the default exported array in 'workflows/index.ts'.
        4. If needed, update the package.json of this package (${this.computed().packageName}) to include a './workflows' export pointing to the 'workflows/index.ts' file.
        5. And! If you do include a './workflows' export, you might need to make the value of "main" be a "." export.`,
    },
    {
      name: "Ensure Dependency",
      prompt: () =>
        `Verify that '"${this.computed().packageName}": "*"' is a dependency in the 'tools/workflows/package.json' file. If it's not present, add it and run 'npm install'.`,
    },
    {
      name: "Update Workflow List",
      prompt: () =>
        `Finally, update 'tools/workflows/list.ts'. 
        1. Import the workflow array exported from the package (e.g., \`import newWorkflows from '${this.computed().packageName}/workflows';\`). Make sure to use the correct package name.
        2. Add the imported workflows to the \`workflowClasses\` array. You can use the spread operator (\`...newWorkflows\`) for this.`,
    },
    {
      name: "Verify Workflow List",
      prompt: () =>
        `As a final check, run the command \`npm exec saf-workflow kickoff help\` in your terminal (any directory). Ensure that your new workflow "${this.getParams().workflowName}" appears in the list.`,
    },
  ];
}
