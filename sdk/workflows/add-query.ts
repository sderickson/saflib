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
  PromptStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "The file path to the template file to be created (e.g., './requests/secrets/list.ts')",
    exampleValue: "./requests/secrets/list.ts",
  },
  {
    name: "urlPath",
    description:
      "The URL path for the API endpoint (e.g., '/secrets' or '/secrets/{id}')",
    exampleValue: "/example",
  },
  {
    name: "method",
    description:
      "The HTTP method in lowercase (e.g., 'get', 'post', 'put', 'delete')",
    exampleValue: "get",
  },
] as const;

interface AddQueryWorkflowContext
  extends ParsePackageNameOutput, ParsePathOutput {
  queryName: string;
  urlPath: string;
  method: string;
}

export const AddSdkQueryWorkflowDefinition = defineWorkflow<
  typeof input,
  AddQueryWorkflowContext
>({
  id: "sdk/add-query",

  description: "Add a new API query to the SDK",

  checklistDescription: ({ targetDir, targetName }) =>
    `Add new API query ${targetName} at ${targetDir}`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const pathResult = parsePath(input.path, {
      requiredSuffix: ".ts",
      cwd: input.cwd,
      requiredPrefix: "./requests/",
    });
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-sdk",
        silentError: true, // so checklists don't error
      }),
      ...pathResult,
      targetDir: input.cwd,
      queryName: pathResult.targetName,
      urlPath: input.urlPath,
      method: input.method,
    };
  },

  templateFiles: {
    index: path.join(sourceDir, "requests/__group-name__/index.ts"),
    indexFakes: path.join(sourceDir, "requests/__group-name__/index.fakes.ts"),
    mocks: path.join(sourceDir, "requests/__group-name__/mocks.ts"),
    templateFile: path.join(
      sourceDir,
      "requests/__group-name__/__query-name__.ts",
    ),
    templateFileFake: path.join(
      sourceDir,
      "requests/__group-name__/__query-name__.fake.ts",
    ),
    templateFileTest: path.join(
      sourceDir,
      "requests/__group-name__/__query-name__.test.ts",
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
      promptMessage: `Update **${context.targetName}.ts** to implement the API query.
      
      Please review documentation here first: ${context.docFiles?.overview}`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      prompt: `Update **${context.targetName}.fake.ts** to implement the fake handler for testing.
      
Mainly it should reflect what is given to it. Have it respect query parameters and request bodies. Don't bother doing validation.

**Mock data**: Define shared mock data arrays in **mocks.ts** (adjacent to this file).
If this is a list query, define the array there (e.g. \`export const mock${context.groupName}: ...\`).
If this query reads from an existing list (e.g. a get-by-id), import the array from \`./mocks.ts\`.
This way operations affect one another (like creating or deleting resources) so that TanStack caching can be tested.

As part of this, also update **${context.targetName}.test.ts** to implement simple tests for the API query.

Include:
* One test that makes sure it works at all.`,
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
      description: "Run tests to ensure the new API query works correctly.",
    })),
  ],
});
