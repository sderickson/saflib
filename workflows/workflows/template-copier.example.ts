import { copyTemplates } from "./template-copier.ts";

// Example: Creating a new workflow with custom templates
export const createCustomWorkflow = async (
  workflowName: string,
  pascalCaseName: string,
) => {
  await copyTemplates({
    sourceTargetPairs: [
      {
        source: "./templates/workflow.ts",
        target: `workflows/${workflowName}.ts`,
      },
      {
        source: "./templates/index.ts",
        target: "workflows/index.ts",
      },
      {
        source: "./templates/package.json",
        target: `workflows/${workflowName}/package.json`,
      },
    ],
    replacements: [
      { from: "{{workflowName}}", to: workflowName },
      { from: "{{pascalCaseName}}", to: pascalCaseName },
      { from: "{{description}}", to: `A custom workflow for ${workflowName}` },
    ],
  });
};

// Example: Creating a new service with multiple files
export const createNewService = async (serviceName: string) => {
  await copyTemplates({
    sourceTargetPairs: [
      {
        source: "./templates/service/main.ts",
        target: `services/${serviceName}/main.ts`,
      },
      {
        source: "./templates/service/package.json",
        target: `services/${serviceName}/package.json`,
      },
      {
        source: "./templates/service/README.md",
        target: `services/${serviceName}/README.md`,
      },
    ],
    replacements: [
      { from: "{{serviceName}}", to: serviceName },
      { from: "{{date}}", to: new Date().toISOString().split("T")[0] },
    ],
  });
};
