import {
  CopyTemplateMachine,
  UpdateStepMachine,
  CommandStepMachine,
  makeWorkflowMachine,
  step,
  XStateWorkflow,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "email-template-template");

const input = [
  {
    name: "path",
    description:
      "Path of the new email template (e.g. './email-templates/weekly-report.ts')",
    exampleValue: "./email-templates/example-email.ts",
  },
] as const;

interface AddEmailTemplateWorkflowContext {
  name: string;
  targetFilePath: string;
}

export const AddEmailTemplateWorkflowMachine = makeWorkflowMachine<
  AddEmailTemplateWorkflowContext,
  typeof input
>({
  id: "add-email-template",

  description: "Add email template infrastructure and templates to a project.",

  input,

  context: ({ input }) => {
    const targetFilePath = path
      .join(process.cwd(), input.path)
      .replace(process.cwd(), "");
    const name = path.basename(input.path).split(".")[0];

    return {
      name,
      targetFilePath,
    };
  },

  templateFiles: {
    template: path.join(sourceDir, "template-file.ts"),
  },

  docFiles: {},

  steps: [
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/email"],
    })),

    step(CopyTemplateMachine, ({ context }) => ({
      name: context.name,
      targetDir: path.dirname(context.targetFilePath),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "template",
      promptMessage: `Implement the email template at ${context.targetFilePath}:

        1. Update the function signature and export name to match your use case
        2. Define the email subject and HTML content
        3. Follow the pattern from existing templates like verify-email.ts and password-reset.ts
        4. Return an object with \`subject\` and \`html\` properties
        5. Use proper TypeScript types

        The template should export a function that takes the necessary parameters and returns EmailContent with subject and html properties.`,
    })),
  ],
});

export class AddEmailTemplateWorkflow extends XStateWorkflow {
  machine = AddEmailTemplateWorkflowMachine;
  description = "Add email template infrastructure and templates to a project.";
  cliArguments = input;
  sourceUrl = import.meta.url;
}
