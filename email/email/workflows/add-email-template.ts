import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  type ParsePathOutput,
  parsePackageName,
  getPackageName,
  parsePath,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "Path of the new email template (e.g. './email-templates/weekly-report.ts')",
    exampleValue: "./emails/example-email.ts",
  },
] as const;

interface AddEmailTemplateWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {}

export const AddEmailTemplateWorkflowDefinition = defineWorkflow<
  typeof input,
  AddEmailTemplateWorkflowContext
>({
  id: "email/add-template",

  description: "Add email template infrastructure and templates to a project.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(getPackageName(input.cwd)),
      ...parsePath(input.path, {
        requiredPrefix: "./emails/",
        requiredSuffix: ".ts",
        cwd: input.cwd,
      }),
    };
  },

  templateFiles: {
    template: path.join(sourceDir, "./emails/__target-name__.ts"),
  },

  docFiles: {},

  manageGit: true,

  steps: [
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install", "@saflib/email"],
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "template",
      promptMessage: `Implement the email template at ${context.copiedFiles!.template}:
  
          1. Update the function signature and export name to match your use case
          2. Define the email subject and HTML content
          3. Follow the pattern from existing templates like verify-email.ts and password-reset.ts
          4. Return an object with \`subject\` and \`html\` properties
          5. Use proper TypeScript types
  
          The template should export a function that takes the necessary parameters and returns EmailContent with subject and html properties.`,
    })),
  ],
});
