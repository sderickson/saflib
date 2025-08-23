import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  runNpmCommandComposer,
  XStateWorkflow,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
  copyTemplateStateComposer,
  updateTemplateFileComposer,
  type TemplateWorkflowContext,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddEmailTemplateWorkflowInput extends WorkflowInput {
  path: string;
}

interface AddEmailTemplateWorkflowContext extends TemplateWorkflowContext {
  camelName: string;
  targetFilePath: string;
  packageJsonPath: string;
}

function toCamelCase(name: string) {
  return name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function toPascalCase(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const AddEmailTemplateWorkflowMachine = setup({
  types: {
    input: {} as AddEmailTemplateWorkflowInput,
    context: {} as AddEmailTemplateWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "add-email-template",
  description: "Add email template infrastructure and templates to a project.",
  initial: "installEmailDependency",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "email-template-template");
    const targetFilePath = path
      .join(process.cwd(), input.path)
      .replace(process.cwd(), "");
    const targetDir = path.dirname(targetFilePath);
    const name = path.basename(input.path).split(".")[0];
    const packageJsonPath = path.join(process.cwd(), "package.json");

    return {
      name,
      pascalName: toPascalCase(name),
      camelName: toCamelCase(name),
      targetDir,
      targetFilePath,
      sourceDir,
      packageJsonPath,
      ...contextFromInput(input),
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    ...runNpmCommandComposer({
      command: "install @saflib/email",
      stateName: "installEmailDependency",
      nextStateName: "copyTemplate",
    }),

    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "implementTemplate",
    }),

    ...updateTemplateFileComposer<AddEmailTemplateWorkflowContext>({
      filePath: (context) => context.targetFilePath,
      promptMessage: (context) =>
        `Implement the email template at ${context.targetFilePath}:

        1. Update the function signature and export name to match your use case
        2. Define the email subject and HTML content
        3. Follow the pattern from existing templates like verify-email.ts and password-reset.ts
        4. Return an object with \`subject\` and \`html\` properties
        5. Use proper TypeScript types

        The template should export a function that takes the necessary parameters and returns EmailContent with subject and html properties.`,
      stateName: "implementTemplate",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class AddEmailTemplateWorkflow extends XStateWorkflow {
  machine = AddEmailTemplateWorkflowMachine;
  description = "Add email template infrastructure and templates to a project.";
  cliArguments = [
    {
      name: "path",
      description:
        "Path of the new email template (e.g. './email-templates/weekly-report.ts')",
      exampleValue: "./email-templates/example-email.ts",
    },
  ];
  sourceUrl = import.meta.url;
}
