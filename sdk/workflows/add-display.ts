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
  "templates/displays/target-name",
);

const input = [
  {
    name: "path",
    description:
      "Path of the new display component (e.g., './displays/example-table')",
    exampleValue: "./displays/example-table",
  },
] as const;

interface AddDisplayWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  targetDir: string;
}

export const AddDisplayWorkflowDefinition = defineWorkflow<
  typeof input,
  AddDisplayWorkflowContext
>({
  id: "sdk/add-display",

  description: "Create a new display component in the SDK package",

  checklistDescription: ({ targetName }) =>
    `Create a new ${targetName} display component.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    // Validate the path format
    if (!input.path.startsWith("./displays/")) {
      throw new Error("Path must start with './displays/'");
    }

    // Validate display name (no extension, all lowercase)
    if (path.basename(input.path).includes(".")) {
      throw new Error(
        "Path should not include file extensions (just the directory the display files will go in)",
      );
    }

    if (input.path !== input.path.toLowerCase()) {
      throw new Error("Path must be all lowercase");
    }

    const targetDir = path.join(input.cwd, input.path);

    return {
      ...parsePath(input.path, {
        requiredPrefix: "./displays/",
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
      promptText: `Export the new Vue component in the root "index.ts" file.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Export the new strings in the root "strings.ts" file.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "vue",
      promptMessage: `Update **${path.basename(context.copiedFiles!.vue)}** to implement the display component.
      
      The component should take as props some combination of the schemas exported by the adjacent "spec" package. Add any strings to the "strings.ts" file, not directly in the component.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the display component.
      
      Structure it similar to the add-spa-page test template, using the mock server, the dedicated test app, and the getElementByString helper function.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(TestStepMachine, () => ({})),
  ],
});
