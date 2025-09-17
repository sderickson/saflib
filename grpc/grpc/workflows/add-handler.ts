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
    name: "path",
    description:
      "The path to the gRPC service package (e.g., 'grpc/secrets-grpc')",
    exampleValue: "grpc/secrets-grpc",
  },
] as const;

interface AddHandlerWorkflowContext {
  path: string;
  serviceDir: string;
  handlerName: string;
}

export const AddHandlerWorkflowDefinition = defineWorkflow<
  typeof input,
  AddHandlerWorkflowContext
>({
  id: "grpc/add-handler",

  // TODO: replace with a description based on the context, also in the present tense like a good commit message.
  description: "Create a new thing",

  // TODO: replace with a description based on the context, also in the present tense like a good commit message.
  checklistDescription: ({ name }) => `Create a new ${name} thing.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    // TODO: replace "output" with where the files should actually go based on the input
    // This will probably be based on the inputs, such as the name of what is being created
    const targetDir = path.join(input.cwd, "output");

    return {
      name: input.name,
      targetDir,
      exampleProperty: "example value",
    };
  },

  // TODO: create the add-handlers dir and add template files
  // Include TODOs like this file does.
  // Instances of "add-handler" in the file name and content will be replaced with the "name" given to CopyStepMachine
   templateFiles: {
    main: path.join(sourceDir, "main.ts"),
    config: path.join(sourceDir, "config.ts"),
    test: path.join(sourceDir, "test.ts"),
  },

  // TODO: add documentation file references
  docFiles: {},

  // TODO: update the steps to match the actual workflow you're creating. It will usually involve some combination of copying template files, updating files, prompting, running scripts, and running tests.
  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "main",
      promptMessage: `Update **${path.basename(context.copiedFiles!.main)}** to implement the main functionality. Replace any TODO comments with actual implementation.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "config",
      promptMessage: `Update **${path.basename(context.copiedFiles!.config)}** with the appropriate configuration for this workflow.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the functionality you implemented. Make sure to mock any external dependencies.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Verify that the ${context.name} workflow is working correctly. Test the functionality manually and ensure all files are properly configured.`,
    })),
  ],
});
