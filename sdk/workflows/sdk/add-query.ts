import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  DocStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "The path to the template file to be created (e.g., 'requests/secrets/list.ts')",
    exampleValue: "requests/secrets/list.ts",
  },
] as const;

interface AddQueryWorkflowContext {
  templateFilePath: string;
  resourceName: string;
  operationName: string;
  targetDir: string;
  resourceDir: string;
}

export const AddQueryWorkflowDefinition = defineWorkflow<
  typeof input,
  AddQueryWorkflowContext
>({
  id: "sdk/add-query",

  description: "Add a new API query/mutation to the SDK",

  checklistDescription: ({ templateFilePath }) =>
    `Add new API query/mutation at ${templateFilePath}`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const templateFilePath = input.path;
    const pathParts = templateFilePath.split("/");
    const resourceName = pathParts[1]; // e.g., "secrets" from "requests/secrets/list.ts"
    const operationName = pathParts[2]?.replace(".ts", "") || "unknown"; // e.g., "list" from "requests/secrets/list.ts"

    const targetDir = input.cwd;
    const resourceDir = path.join(targetDir, "requests", resourceName);

    return {
      templateFilePath,
      resourceName,
      operationName,
      targetDir,
      resourceDir,
    };
  },

  templateFiles: {
    index: path.join(sourceDir, "index.ts"),
    indexFakes: path.join(sourceDir, "index.fakes.ts"),
    templateFile: path.join(sourceDir, "template-file.ts"),
    templateFileFake: path.join(sourceDir, "template-file.fake.ts"),
    templateFileTest: path.join(sourceDir, "template-file.test.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(DocStepMachine, () => ({
      docId: "overview",
      promptMessage:
        "Review the SDK overview documentation to understand the structure and requirements for adding new API queries/mutations.",
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.operationName,
      targetDir: context.resourceDir,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Check that the resource "${context.resourceName}" is included in requests/fake-store.ts (and that the file exists at all). Add it if not.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFile",
      promptMessage: `Update **${context.operationName}.ts** to implement the API query/mutation. Include both a sample query and a sample mutation for reference.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFileFake",
      promptMessage: `Update **${context.operationName}.fake.ts** to implement the fake handlers for testing.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFileTest",
      promptMessage: `Update **${context.operationName}.test.ts** to implement comprehensive tests for the API query/mutation.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "index",
      promptMessage: `Update **${context.resourceName}/index.ts** to export the new query/mutation functions.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "indexFakes",
      promptMessage: `Update **${context.resourceName}/index.fakes.ts** to export the new fake handlers.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update the root level index.ts to export the new query/mutation functions.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update the root level fakes.ts to export the new fake handlers.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm run typecheck",
      description:
        "Run TypeScript type checking to ensure all types are correct.",
    })),

    step(CommandStepMachine, () => ({
      command: "npm run test",
      description:
        "Run tests to ensure the new API query/mutation works correctly.",
    })),
  ],
});
