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
      "The name of the export to create (e.g., 'myFunction' or 'MyClass')",
    exampleValue: "myFunction",
  },
  {
    name: "path",
    description:
      "The relative path where the export should be added (e.g., 'src/utils' or 'src/components')",
    exampleValue: "src/utils",
  },
] as const;

interface AddExportWorkflowContext {
  name: string;
  path: string;
  targetDir: string;
  exportPath: string;
  indexPath: string;
}

export const AddExportWorkflowDefinition = defineWorkflow<
  typeof input,
  AddExportWorkflowContext
>({
  id: "monorepo/add-export",

  description: "Add new exports (functions, classes, interfaces) to packages",

  checklistDescription: ({ name, path }) => `Add ${name} export to ${path}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, input.path);
    const exportPath = path.join(targetDir, `${input.name}.ts`);
    const indexPath = path.join(input.cwd, "index.ts");

    return {
      name: input.name,
      path: input.path,
      targetDir,
      exportPath,
      indexPath,
    };
  },

  // TODO: create the add-exports dir and add template files
  // Include TODOs like this file does.
  // Instances of "add-export" in the file name and content will be replaced with the "name" given to CopyStepMachine
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
