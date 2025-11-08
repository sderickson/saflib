import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
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

  templateFiles: {
    export: path.join(sourceDir, "template-file.ts"),
    test: path.join(sourceDir, "template-file.test.ts"),
  },

  versionControl: {
    allowPaths: ["./docs/**"],
  },

  // TODO: add documentation file references
  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "export",
      promptMessage: `Update **${path.basename(context.copiedFiles!.export)}** to implement the ${context.name} export.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the ${context.name} functionality.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add the ${context.name} export to the package's index.ts file. Import and export the new functionality from ${context.exportPath}.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-docs", "generate"],
    })),
  ],
});
