import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "The path to the template file to be created (e.g., 'requests/secrets/list.ts')",
    exampleValue: "./requests/secrets/list.ts",
  },
] as const;

interface AddQueryWorkflowContext
  extends ParsePackageNameOutput,
    ParsePathOutput {}

export const AddQueryWorkflowDefinition = defineWorkflow<
  typeof input,
  AddQueryWorkflowContext
>({
  id: "sdk/add-query",

  description: "Add a new API query/mutation to the SDK",

  checklistDescription: ({ targetDir, targetName }) =>
    `Add new API query/mutation ${targetName} at ${targetDir}`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-sdk",
      }),
      ...parsePath(input.path, {
        requiredSuffix: ".ts",
        cwd: input.cwd,
        requiredPrefix: "./requests/",
      }),
      targetDir: input.cwd,
    };
  },

  templateFiles: {
    index: path.join(sourceDir, "requests/__group-name__/index.ts"),
    indexFakes: path.join(sourceDir, "requests/__group-name__/index.fakes.ts"),
    templateFile: path.join(
      sourceDir,
      "requests/__group-name__/__target-name__.ts",
    ),
    templateFileFake: path.join(
      sourceDir,
      "requests/__group-name__/__target-name__.fake.ts",
    ),
    templateFileTest: path.join(
      sourceDir,
      "requests/__group-name__/__target-name__.test.ts",
    ),
    rootIndex: path.join(sourceDir, "index.ts"),
    rootFakes: path.join(sourceDir, "fakes.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  manageGit: true,

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFile",
      promptMessage: `Update **${context.targetName}.ts** to implement the API query/mutation. Delete whichever one is not needed.
      
      Please review documentatino here first: ${context.docFiles?.overview}`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFileFake",
      promptMessage: `Update **${context.targetName}.fake.ts** to implement the fake handlers for testing.
      
      Mainly it should reflect what is given to it. Have it respect query parameters and request bodies. Don't bother doing validation.
      If this is a list query, keep the resources in a separately exported array. Otherwise, import that array and modify/use it accordingly.
      This way operations affect one another (like creating or deleting resources) so that tanstack caching can be tested.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFileTest",
      promptMessage: `Update **${context.targetName}.test.ts** to implement simple tests for the API query/mutation.
      
      Include:
      * One test that makes sure it works at all.
      * Another test for (if it's a mutation) making sure the caching works.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "index",
      promptMessage: `Update **${context.targetName}/index.ts** to export the new query/mutation functions.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "indexFakes",
      promptMessage: `Update **${context.targetName}/index.fakes.ts** to export the new fake handlers.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update the root level index.ts to export the new query/mutation functions.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update the root level fakes.ts to export the new fake handlers.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      description:
        "Run TypeScript type checking to ensure all types are correct.",
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
      description:
        "Run tests to ensure the new API query/mutation works correctly.",
    })),
  ],
});
