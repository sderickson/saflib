import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  defineWorkflow,
  step,
  parsePath,
  type ParsePathOutput,
  makeLineReplace,
  type ParsePackageNameOutput,
  parsePackageName,
  getPackageName,
  CommandStepMachine,
} from "@saflib/workflows";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "Path of the new component (e.g., './displays/example-table' or './forms/user-form')",
    exampleValue: "./displays/example-table",
  },
] as const;

interface AddComponentWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  targetDir: string;
  prefixName: string;
}

export const AddComponentWorkflowDefinition = defineWorkflow<
  typeof input,
  AddComponentWorkflowContext
>({
  id: "sdk/add-component",

  description: "Create a new component in the SDK package",

  checklistDescription: ({ targetName }) =>
    `Create a new ${targetName} component.`,

  input,

  sourceUrl: import.meta.url,

  manageGit: true,

  context: ({ input }) => {
    // Validate the path format
    if (
      !input.path.startsWith("./displays/") &&
      !input.path.startsWith("./forms/") &&
      !input.path.startsWith("./components/")
    ) {
      throw new Error(
        "Path must start with './displays/' or './forms/' or './components/'",
      );
    }
    const firstDir = `./${input.path.split("/")[1]}/`;

    // Validate component name (no extension, all lowercase)
    if (path.basename(input.path).includes(".")) {
      throw new Error(
        "Path should not include file extensions (just the directory the component files will go in)",
      );
    }

    if (input.path !== input.path.toLowerCase()) {
      throw new Error("Path must be all lowercase");
    }

    // const targetDir = path.join(input.cwd, input.path);

    return {
      ...parsePath(input.path, {
        requiredPrefix: firstDir,
        cwd: input.cwd,
      }),
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-sdk",
      }),
      targetDir: input.cwd,
      prefixName: firstDir,
    };
  },

  templateFiles: {
    vue: path.join(
      sourceDir,
      "__prefix-name__/__target-name__/__TargetName__.vue",
    ),
    strings: path.join(
      sourceDir,
      "__prefix-name__/__target-name__/__TargetName__.strings.ts",
    ),
    test: path.join(
      sourceDir,
      "__prefix-name__/__target-name__/__TargetName__.test.ts",
    ),
    packageStrings: path.join(sourceDir, "strings.ts"),
    packageComponents: path.join(sourceDir, "components.ts"),
  },

  // TODO: add documentation file references
  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "vue",
      promptMessage: `Update **${path.basename(context.copiedFiles!.vue)}** to implement the component.

      * The component should take as props some combination of the schemas exported by the adjacent "spec" package.
      * For form components, make a ref for each field in the form, populated with the prop data.
      * Add any strings to the "strings.ts" file, not directly in the component.
      * Do not use any custom styles; use Vuetify components and styling exclusively.
      * Use Vuetify skeletons for loading states.
      * If this is a form, don't use inputs for any uneditable fields. If this is not a form component, don't use input components at all!
      * If the component uses mutations, make sure to use "showError" for network errors.`,
    })),

    step(
      UpdateStepMachine,
      ({ context }) => ({
        fileId: "test",
        promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the component.
      
      * Make sure to use the dedicated test app, and the getElementByString helper function.
      * You don't really have to mock the server; the component should not load data directly itself. You also don't have to thoroughly test the component; just give it some sample inputs and make sure it renders correctly.
      `,
      }),
      {
        validate: async ({ context }) => {
          const content = readFileSync(context.copiedFiles!.test, "utf-8");
          const testLength = content.split("\n").length;
          if (testLength > 300) {
            return `Test file is too long at ${testLength} lines. Component tests should be short, ideally only one test making sure it renders. Look for ways to simplify the test.`;
          }
          return Promise.resolve(undefined);
        },
      },
    ),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `If this is a new component, set up the appropriate exports.

      * Make sure ${context.copiedFiles?.vue} is in the root "components.ts" file.
      * Make sure ${context.copiedFiles?.strings} is in the root "strings.ts" file.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(TestStepMachine, () => ({})),
  ],
});
