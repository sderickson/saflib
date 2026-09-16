import path from "node:path";
import {
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runPromptStep,
  runCommandStep,
  type CopyStepInput,
  type UpdateStepInput,
  type PromptStepInput,
  type CommandStepInput,
  type ParsePackageNameOutput,
  type ParsePathOutput,
} from "@saflib/new-workflows";
import { kebabCaseToCamelCase, kebabCaseToPascalCase } from "@saflib/utils";
import { templatesProductRoot, templatesSaflibRoot } from "@saflib/templates";

const sdkRoot = path.join(templatesProductRoot, "service", "sdk");
const requestDir = path.join(sdkRoot, "requests", "__group-name__");
const overviewDoc = path.join(templatesSaflibRoot, "sdk", "docs", "01-overview.md");

interface AddMutationInput {
  path: string;
  urlPath: string;
  method: string;
  upload?: boolean;
  download?: boolean;
  /** What the mutation should actually do, e.g. "execute a scan and return its id". */
  prompt?: string;
}

interface AddMutationContext extends ParsePackageNameOutput, ParsePathOutput {
  mutationName: string;
  operationId: string;
  upload: boolean;
  download: boolean;
  urlPath: string;
  method: string;
  prompt?: string;
}

/** Ported from `sdk/workflows/add-mutation.ts` — same templates/prompts/step order. */
export const AddSdkMutationWorkflowDefinition = defineWorkflow<
  AddMutationInput,
  AddMutationContext
>({
  id: "sdk/add-mutation",

  description: "Add a new API mutation to the SDK",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "The file path to the template file to be created (e.g., './requests/scans/execute.ts')",
      },
      urlPath: {
        type: "string",
        description: "The URL path for the API endpoint (e.g., '/scans/{id}/execute')",
      },
      method: {
        type: "string",
        description: "The HTTP method in lowercase (e.g., 'post', 'put', 'delete')",
      },
      upload: {
        type: "boolean",
        description: "Mutation sends a file via FormData (e.g. multipart upload)",
      },
      download: {
        type: "boolean",
        description: "Mutation returns binary (e.g. blob/arrayBuffer from fetch)",
      },
      prompt: {
        type: "string",
        description:
          "What the mutation should actually do, e.g. 'execute a scan and return its id'. Passed to the agent implementing it.",
      },
    },
    required: ["path", "urlPath", "method"],
  },

  context: ({ input, cwd }) => {
    const pathResult = parsePath(input.path, {
      requiredSuffix: ".ts",
      cwd,
      requiredPrefix: "./requests/",
    });
    const operationId =
      kebabCaseToCamelCase(pathResult.targetName.split(".")[0]) +
      kebabCaseToPascalCase(pathResult.groupName);
    return {
      ...parsePackageName(getPackageName(cwd), {
        requiredSuffix: "-sdk",
        silentError: true, // so checklists/dry-runs don't error
      }),
      // Keep pathResult.targetDir (…/requests/<group>) — templates share one
      // stub dir so sharedPrefix has no `requests/<group>` segment to restore.
      ...pathResult,
      mutationName: pathResult.targetName,
      operationId,
      upload: input.upload ?? false,
      download: input.download ?? false,
      urlPath: input.urlPath,
      method: input.method,
      prompt: input.prompt,
    };
  },

  steps: [
    step<CopyStepInput, AddMutationContext>("copy", runCopyStep, ({ context }) => {
      const lineReplace = makeLineReplace(context);
      return {
        templateFiles: {
          indexFakes: path.join(requestDir, "index.fakes.ts"),
          mocks: path.join(requestDir, "mocks.ts"),
          templateFile: path.join(requestDir, "__mutation-name__.ts"),
          templateFileFake: path.join(requestDir, "__mutation-name__.fake.ts"),
          templateFileTest: path.join(requestDir, "__mutation-name__.test.ts"),
        },
        name: context.targetName,
        targetDir: context.targetDir,
        flags: { upload: context.upload, download: context.download },
        lineReplace: (line: string) => {
          let out = line;
          // Keep `baseHandler`; only remap the golden spec package name.
          out = out.split("@saflib/base-spec").join(`${context.sharedPackagePrefix}-spec`);
          return lineReplace(out);
        },
      };
    }),

    step<UpdateStepInput, AddMutationContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "templateFile",
      prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}Update **${context.targetName}.ts** to implement the API mutation.
      ${context.upload ? "This mutation accepts a File and sends it as FormData (body: formData as unknown as request body type)." : ""}
      ${context.download ? "This mutation returns binary: use fetch (or similar) to call the endpoint, then response.arrayBuffer() or response.blob() and return it. Set Accept or leave default as needed. Handle non-ok responses (e.g. parse JSON error body when available)." : ""}

      Please review documentation here first: ${overviewDoc}`,
    })),

    step<PromptStepInput, AddMutationContext>("prompt", runPromptStep, ({ context }) => ({
      prompt: `Update **${context.targetName}.fake.ts** to implement the fake handler for testing.

Mainly it should reflect what is given to it. Have it respect query parameters and request bodies. Don't bother doing validation.

**Mock data**: Import the shared mock data array from **mocks.ts** (adjacent to this file) and
modify it in the handler. For create mutations, push a new item. For delete, splice it out.
For update, modify in place. This way operations affect one another so that TanStack caching
can be tested. When creating new mock rows, prefer factories from product \`*-test\` packages
(\`@scope/<product>-test/factories/*\` / \`@scope/<product>-<offshoot>-test/factories/*\`).

As part of this, also update **${context.targetName}.test.ts** to implement simple tests for the API mutation.

Include:
* One test that makes sure it works at all.
* Another test for making sure the caching works (that related queries are invalidated after the mutation).`,
    })),

    step<CommandStepInput, AddMutationContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<CommandStepInput, AddMutationContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default AddSdkMutationWorkflowDefinition;
