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
import { kebabCaseToCamelCase, kebabCaseToPascalCase } from "@saflib/utils";
import { templatesProductRoot } from "@saflib/templates";
import path from "node:path";

const sdkRoot = path.join(templatesProductRoot, "service", "sdk");
const requestDir = path.join(sdkRoot, "requests", "__group-name__");
/** Live fakes.ts — areas hold the stub group; CopyStep upserts them. */
const fakesLive = path.join(sdkRoot, "fakes.ts");

const input = [
  {
    name: "path",
    description:
      "The file path to the template file to be created (e.g., './requests/scans/execute.ts')",
    exampleValue: "./requests/scans/execute.ts",
  },
  {
    name: "urlPath",
    description:
      "The URL path for the API endpoint (e.g., '/scans/{id}/execute')",
    exampleValue: "/example",
  },
  {
    name: "method",
    description:
      "The HTTP method in lowercase (e.g., 'post', 'put', 'delete')",
    exampleValue: "post",
  },
  {
    name: "upload",
    type: "flag" as const,
    description: "Mutation sends a file via FormData (e.g. multipart upload)",
  },
  {
    name: "download",
    type: "flag" as const,
    description: "Mutation returns binary (e.g. blob/arrayBuffer from fetch)",
  },
] as const;

interface AddMutationWorkflowContext
  extends ParsePackageNameOutput,
    ParsePathOutput {
  mutationName: string;
  operationId: string;
  upload: boolean;
  download: boolean;
  urlPath: string;
  method: string;
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
    });
    const operationId =
      kebabCaseToCamelCase(pathResult.targetName.split(".")[0]) +
      kebabCaseToPascalCase(pathResult.groupName);
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-sdk",
        silentError: true, // so checklists don't error
      }),
      ...pathResult,
      targetDir: input.cwd,
      mutationName: pathResult.targetName,
      operationId,
      upload: input.upload ?? false,
      download: input.download ?? false,
      urlPath: input.urlPath,
      method: input.method,
    };
  },

  templateFiles: {
    indexFakes: path.join(requestDir, "index.fakes.ts"),
    mocks: path.join(requestDir, "mocks.ts"),
    templateFile: path.join(
      requestDir,
      "__mutation-name__.ts",
    ),
    templateFileFake: path.join(
      requestDir,
      "__mutation-name__.fake.ts",
    ),
    templateFileTest: path.join(
      requestDir,
      "__mutation-name__.test.ts",
    ),
    rootFakes: fakesLive,
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => {
      const lineReplace = makeLineReplace(context);
      return {
        name: context.targetName,
        targetDir: context.targetDir,
        flags: { upload: context.upload, download: context.download },
        lineReplace: (line: string) => {
          let out = line;
          out = out.split("baseHandler").join(`${context.serviceName}Handler`);
          out = out
            .split("@saflib/base-spec")
            .join(`${context.sharedPackagePrefix}-spec`);
          return lineReplace(out);
        },
      };
    }),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFile",
      promptMessage: `Update **${context.targetName}.ts** to implement the API mutation.
      ${context.upload ? "This mutation accepts a File and sends it as FormData (body: formData as unknown as request body type)." : ""}
      ${context.download ? "This mutation returns binary: use fetch (or similar) to call the endpoint, then response.arrayBuffer() or response.blob() and return it. Set Accept or leave default as needed. Handle non-ok responses (e.g. parse JSON error body when available)." : ""}
      
      Please review documentation here first: ${context.docFiles?.overview}`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      prompt: `Update **${context.targetName}.fake.ts** to implement the fake handler for testing.
      
Mainly it should reflect what is given to it. Have it respect query parameters and request bodies. Don't bother doing validation.

**Mock data**: Import the shared mock data array from **mocks.ts** (adjacent to this file) and
modify it in the handler. For create mutations, push a new item. For delete, splice it out.
For update, modify in place. This way operations affect one another so that TanStack caching
can be tested.

As part of this, also update **${context.targetName}.test.ts** to implement simple tests for the API mutation.

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
