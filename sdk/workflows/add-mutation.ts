import {
  CopyStepMachine,
  UpdateStepMachine,
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
      "The path to the template file to be created (e.g., 'requests/scans/execute.ts')",
    exampleValue: "./requests/scans/execute.ts",
  },
] as const;

interface AddMutationWorkflowContext
  extends ParsePackageNameOutput, ParsePathOutput {
    mutationName: string;
  }

export const AddSdkMutationWorkflowDefinition = defineWorkflow<
  typeof input,
  AddMutationWorkflowContext
>({
  id: "sdk/add-mutation",

  description: "Add a new API mutation to the SDK",

  checklistDescription: ({ targetDir, targetName }) =>
    `Add new API mutation ${targetName} at ${targetDir}`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const pathResult = parsePath(input.path, {
      requiredSuffix: ".ts",
      cwd: input.cwd,
      requiredPrefix: "./requests/",
    })
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-sdk",
        silentError: true, // so checklists don't error
      }),
      ...parsePath(input.path, {
        requiredSuffix: ".ts",
        cwd: input.cwd,
        requiredPrefix: "./requests/",
      }),
      targetDir: input.cwd,
      mutationName: pathResult.targetName,
    };
  },

  templateFiles: {
    index: path.join(sourceDir, "requests/__group-name__/index.ts"),
    indexFakes: path.join(sourceDir, "requests/__group-name__/index.fakes.ts"),
    templateFile: path.join(
      sourceDir,
      "requests/__group-name__/__mutation-name__.ts",
    ),
    templateFileFake: path.join(
      sourceDir,
      "requests/__group-name__/__mutation-name__.fake.ts",
    ),
    templateFileTest: path.join(
      sourceDir,
      "requests/__group-name__/__mutation-name__.test.ts",
    ),
    rootIndex: path.join(sourceDir, "index.ts"),
    rootFakes: path.join(sourceDir, "fakes.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFile",
      promptMessage: `Update **${context.targetName}.ts** to implement the API mutation.
      
      Please review documentation here first: ${context.docFiles?.overview}`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFileFake",
      promptMessage: `Update **${context.targetName}.fake.ts** to implement the fake handlers for testing.
      
      Mainly it should reflect what is given to it. Have it respect query parameters and request bodies. Don't bother doing validation.
      If this is a list query, keep the resources in a separately exported array. Otherwise, if it would affect that list, import that array and modify/use it accordingly.
      This way operations affect one another (like creating or deleting resources) so that tanstack caching can be tested.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFileTest",
      promptMessage: `Update **${context.targetName}.test.ts** to implement simple tests for the API mutation.
      
      Include:
      * One test that makes sure it works at all.
      * Another test for making sure the caching works (that related queries are invalidated after the mutation).`,
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
        "Run tests to ensure the new API mutation works correctly.",
    })),
  ],
});
