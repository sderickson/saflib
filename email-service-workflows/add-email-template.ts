import path from "node:path";
import {
  defineWorkflow,
  step,
  runCopyStep,
  runUpdateStep,
  parsePackageName,
  getPackageName,
  parsePath,
  makeLineReplace,
  type CopyStepInput,
  type UpdateStepInput,
  type ParsePackageNameOutput,
  type ParsePathOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot } from "@saflib/templates";

const emailStub = path.join(templatesProductRoot, "service/email/emails/__target-name__.ts");

interface AddEmailTemplateInput {
  /** Path of the new email template (e.g. './emails/weekly-report.ts'). */
  path: string;
}

interface AddEmailTemplateContext extends ParsePathOutput, ParsePackageNameOutput {}

/**
 * Ported from `email/email-service/workflows/add-email-template.ts` — same
 * template, same prompt, same step order, running on the new sqlite-backed
 * engine instead of XState.
 */
export const AddEmailTemplateWorkflowDefinition = defineWorkflow<
  AddEmailTemplateInput,
  AddEmailTemplateContext
>({
  id: "email/add-template",

  description: "Add email template infrastructure and templates to a project.",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path of the new email template (e.g. './emails/weekly-report.ts')",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
    return {
      ...parsePackageName(getPackageName(cwd)),
      ...parsePath(input.path, {
        requiredPrefix: "./emails/",
        requiredSuffix: ".ts",
        cwd,
      }),
    };
  },

  steps: [
    step<CopyStepInput, AddEmailTemplateContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        template: emailStub,
      },
      name: context.targetName,
      // `targetDir` from `parsePath` (cwd + "/emails") — this template is a
      // single flat file with no `__group-name__` subdirectory in its own
      // source path (unlike e.g. drizzle/add-query's query+test pair), so
      // there's no directory structure for the copy step to reconstruct on
      // its own; the full destination dir has to be passed in directly.
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, AddEmailTemplateContext>("update", runUpdateStep, () => ({
      fileId: "template",
      prompt: `Implement the email template.

      1. Update the function signature and export name to match your use case
      2. Define the email subject and HTML content
      3. Follow the pattern from existing templates like verify-email.ts and password-reset.ts
      4. Return an object with \`subject\` and \`html\` properties
      5. Use proper TypeScript types

      The template should export a function that takes the necessary parameters and returns EmailContent with subject and html properties.`,
    })),
  ],
});

export default AddEmailTemplateWorkflowDefinition;
