import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  defineWorkflow,
  step,
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
      "Path of the new display component (e.g., './displays/secret-table')",
    exampleValue: "./displays/secret-table",
  },
] as const;

interface AddDisplayWorkflowContext {
  displayName: string;
  componentName: string;
  targetDir: string;
}

export const AddDisplayWorkflowDefinition = defineWorkflow<
  typeof input,
  AddDisplayWorkflowContext
>({
  id: "sdk/add-display",

  description: "Create a new display component in the SDK package",

  checklistDescription: ({ displayName }) =>
    `Create a new ${displayName} display component.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    // Validate the path format
    if (!input.path.startsWith("./displays/")) {
      throw new Error("Path must start with './displays/'");
    }

    // Extract the display name from the path
    const displayName = input.path.replace("./displays/", "");

    // Validate display name (no extension, all lowercase)
    if (displayName.includes(".")) {
      throw new Error("Display name should not include file extensions");
    }

    if (displayName !== displayName.toLowerCase()) {
      throw new Error("Display name must be all lowercase");
    }

    // Convert kebab-case to PascalCase for component name
    const componentName = displayName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

    const targetDir = path.join(input.cwd, "displays", displayName);

    return {
      displayName,
      componentName,
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
      name: context.displayName,
      targetDir: context.targetDir,
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
