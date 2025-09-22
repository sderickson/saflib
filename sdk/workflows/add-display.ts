import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "Name of the display component in kebab-case (e.g. 'user-profile-card')",
    exampleValue: "example-display",
  },
] as const;

interface AddDisplayWorkflowContext {
  name: string;
  targetDir: string;
}

export const AddDisplayWorkflowDefinition = defineWorkflow<
  typeof input,
  AddDisplayWorkflowContext
>({
  id: "sdk/add-display",

  description:
    "Create a new display component in an SDK package, using a template and renaming placeholders.",

  checklistDescription: ({ name }) => `Create a new ${name} display component.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const componentName = input.name.endsWith("-display")
      ? input.name
      : input.name + "-display";
    const targetDir = path.join(input.cwd, "components", componentName);
    return { name: componentName, targetDir };
  },

  templateFiles: {
    component: path.join(sourceDir, "TemplateFile.tsx"),
    test: path.join(sourceDir, "TemplateFile.test.ts"),
    strings: path.join(sourceDir, "TemplateFile.strings.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "component",
      promptMessage: `Update **${path.basename(context.copiedFiles!.component)}**: implement the display component with proper TypeScript props interface.
      
      The component should:
      * Accept props that match schemas from the OpenAPI specification
      * Use proper TypeScript types for all props
      * Render the data in a clean, accessible way
      * Include proper JSDoc comments for the component and props`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "strings",
      promptMessage: `Update **${path.basename(context.copiedFiles!.strings)}**: include all text strings used in the component.
      
      Use string keys that will work well with the translation system (e.g., 'title', 'subtitle', 'description', etc.).`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Add the strings to the **strings.ts** file in the root of the package.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "component",
      promptMessage: `Update **${path.basename(context.copiedFiles!.component)}** to use the translation system.
      
      Import and use the translation function and use t(strings.key) instead of strings.key for all text.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}**: test that the component renders correctly with sample data.
      
      * Test that the component renders without errors
      * Test that it displays the expected data
      * Test with different prop combinations
      * Use proper TypeScript types for test data`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Export the new ${context.name} component from the package's main index.ts file.`,
    })),
  ],
});
