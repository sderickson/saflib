import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "template-files");

// TODO: replace this with the actual input for your workflow
const input = [
  {
    name: "name",
    description:
      "The name of the thing to create (e.g., 'my-component' or 'my-service')",
    exampleValue: "example-thingy",
  },
] as const;

// TODO: Remove exampleProperty and replace it with the actual context properties your workflow needs
interface TemplateFileWorkflowContext {
  name: string;
  pascalName: string;
  targetDir: string;
  // Add any additional context properties your workflow needs
  exampleProperty: string;
}

export const TemplateFileWorkflowDefinition = defineWorkflow<
  typeof input,
  TemplateFileWorkflowContext
>({
  id: "template-file",

  description: "TODO: Describe what this workflow does",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    // TODO: replace "output" with where the files should actually go based on the input
    // This will probably be based on the inputs, such as the name of what is being created
    const targetDir = path.join(process.cwd(), "output");

    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      targetDir,
      exampleProperty: "example value",
    };
  },

  // TODO: create the template-files dir and add template files
  // Include TODOs like this file does.
  templateFiles: {
    main: path.join(sourceDir, "main.ts"),
    config: path.join(sourceDir, "config.ts"),
    test: path.join(sourceDir, "test.ts"),
  },

  docFiles: {},

  // TODO: update the steps to match the actual workflow you're creating. It will usually involve some combination of copying template files, updating files, and running tests.
  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "main",
      promptMessage: `Please update **${path.basename(context.copiedFiles!.main)}** to implement the main functionality. Replace any TODO comments with actual implementation.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "config",
      promptMessage: `Please update **${path.basename(context.copiedFiles!.config)}** with the appropriate configuration for this workflow.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Please update **${path.basename(context.copiedFiles!.test)}** to test the functionality you implemented. Make sure to mock any external dependencies.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Please verify that the ${context.name} workflow is working correctly. Test the functionality manually and ensure all files are properly configured.`,
    })),
  ],
});
