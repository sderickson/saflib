import {
  CopyStepMachine,
  UpdateStepMachine,
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(
  import.meta.dirname,
  "template/__product-name__-__subdomain-name__-spa/e2e/__target-name__",
);

const input = [
  {
    name: "path",
    description: "Path of the new e2e test (e.g., './e2e/test-name')",
    exampleValue: "./e2e/test-name",
  },
] as const;

interface AddE2eTestWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  targetDir: string;
}

export const AddE2eTestWorkflowDefinition = defineWorkflow<
  typeof input,
  AddE2eTestWorkflowContext
>({
  id: "vue/add-e2e-test",

  description:
    "Create a new E2E test in a SAF-powered Vue SPA, using a template and renaming placeholders.",

  checklistDescription: ({ targetName }) =>
    `Create a new ${targetName} E2E test.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, input.path);
    return {
      ...parsePath(input.path, {
        requiredPrefix: "./e2e/",
        cwd: input.cwd,
      }),
      ...parsePackageName(getPackageName(input.cwd), {
        silentError: true, // so checklists don't error
        requiredSuffix: ["-spa", "-sdk"],
      }),
      targetDir,
    };
  },

  templateFiles: {
    spec: path.join(sourceDir, "__target-name__.spec.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "spec",
      promptMessage: `Update **${path.basename(context.copiedFiles!.spec)}** to implement the E2E test workflow:
        
        * Use fixtures from this package and the adjacent "common" package.
        * Use the product fixture's step() method to create test steps with automatic screenshot capture.
        * Use utilities from @saflib/playwright, such as getByString to locate elements using i18n strings.
        * Implement a complete user workflow that tests the functionality end-to-end.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test:e2e"],
    })),
  ],
});
