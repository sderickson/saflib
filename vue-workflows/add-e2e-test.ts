import path from "node:path";
import {
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
  type ParsePathOutput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot } from "@saflib/templates";

const sourceDir = path.join(templatesProductRoot, "clients/__subdomain-name__/e2e/__target-name__");

interface AddE2eTestInput {
  path: string;
  /** What the test should actually cover, e.g. "create a todo and confirm it appears in the list". */
  prompt?: string;
}

interface AddE2eTestWorkflowContext extends ParsePathOutput, ParsePackageNameOutput {
  prompt?: string;
}

/**
 * Ported from `vue/workflows/add-e2e-test.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const AddE2eTestWorkflowDefinition = defineWorkflow<
  AddE2eTestInput,
  AddE2eTestWorkflowContext
>({
  id: "vue/add-e2e-test",

  description:
    "Create a new E2E test in a SAF-powered Vue SPA, using a template and renaming placeholders.",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path of the new e2e test (e.g., './e2e/test-name.spec.ts')",
      },
      prompt: {
        type: "string",
        description:
          "What the test should actually cover, e.g. 'create a todo and confirm it appears in the list'. Passed to the agent implementing it.",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => ({
    ...parsePath(input.path, {
      requiredPrefix: "./e2e/",
      cwd,
      requiredSuffix: ".spec.ts",
    }),
    ...parsePackageName(getPackageName(cwd), {
      silentError: true, // so checklists/dry-runs don't error
      requiredSuffix: ["-spa", "-sdk"],
    }),
    prompt: input.prompt,
  }),

  steps: [
    step<CopyStepInput, AddE2eTestWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        spec: path.join(sourceDir, "__target-name__.spec.ts"),
      },
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, AddE2eTestWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "spec",
      prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}Update **${context.targetName}.spec.ts** to implement the E2E test workflow:

        * Import page fixtures from co-located paths via the SPA package glob (e.g. \`@scope/pkg/pages/home/Home.fixture.ts\`) or a same-package relative path — never from a root \`@pkg/fixtures\` barrel.
        * Import shared product helpers from the adjacent "common" package (\`@scope/product-clients-common/fixtures\`).
        * Use the product fixture's step() method to create test steps with automatic screenshot capture.
        * Use utilities from @saflib/playwright, such as getByString to locate elements using i18n strings.
        * Use the product fixture's assertEvent() method to assert that certain event types were fired.
        * Use "npm run typecheck" for easy fixes.
        * Use "npm run test:e2e" to run the test and see the results.`,
    })),

    step<CommandStepInput, AddE2eTestWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<CommandStepInput, AddE2eTestWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test:e2e"],
    })),
  ],
});

export default AddE2eTestWorkflowDefinition;
