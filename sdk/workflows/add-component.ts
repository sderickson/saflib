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
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(
  import.meta.dirname,
  "templates/components/target-name",
);

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

    const targetDir = path.join(input.cwd, input.path);

    return {
      ...parsePath(input.path, {
        requiredPrefix: firstDir,
        cwd: input.cwd,
      }),
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-sdk",
      }),
      targetDir,
    };
  },

  templateFiles: {
    vue: path.join(sourceDir, "__TargetName__.vue"),
    strings: path.join(sourceDir, "__TargetName__.strings.ts"),
    test: path.join(sourceDir, "__TargetName__.test.ts"),
  },

  // TODO: add documentation file references
  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(PromptStepMachine, () => ({
      promptText: `Export the new Vue component in the root "components.ts" file.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Export the new strings in the root "strings.ts" file.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "vue",
      promptMessage: `Update **${path.basename(context.copiedFiles!.vue)}** to implement the component.
      
      * The component should take as props some combination of the schemas exported by the adjacent "spec" package. For form components, consider using defineModel() with the schemas from the spec package for two-way data binding. Add any strings to the "strings.ts" file, not directly in the component.
      * Do not use any custom styles; use Vuetify components and styling exclusively.
      * Use Vuetify skeletons for loading states.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the component.
      
      Make sure to use the mock server, the dedicated test app, and the getElementByString helper function.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(TestStepMachine, () => ({})),
  ],
});
