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
import { templatesProductRoot, templatesSaflibRoot } from "@saflib/templates";

const sdkRoot = path.join(templatesProductRoot, "service", "sdk");
const requestDir = path.join(sdkRoot, "requests", "__group-name__");
const overviewDoc = path.join(templatesSaflibRoot, "sdk", "docs", "01-overview.md");

interface AddQueryInput {
  path: string;
  urlPath: string;
  method: string;
  /** What the query should actually do, e.g. "list all secrets ordered by name". */
  prompt?: string;
}

interface AddQueryContext extends ParsePackageNameOutput, ParsePathOutput {
  queryName: string;
  urlPath: string;
  method: string;
  prompt?: string;
}

/** Ported from `sdk/workflows/add-query.ts` — same templates/prompts/step order. */
export const AddSdkQueryWorkflowDefinition = defineWorkflow<AddQueryInput, AddQueryContext>({
  id: "sdk/add-query",

  description: "Add a new API query to the SDK",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "The file path to the template file to be created (e.g., './requests/secrets/list.ts')",
      },
      urlPath: {
        type: "string",
        description: "The URL path for the API endpoint (e.g., '/secrets' or '/secrets/{id}')",
      },
      method: {
        type: "string",
        description: "The HTTP method in lowercase (e.g., 'get', 'post', 'put', 'delete')",
      },
      prompt: {
        type: "string",
        description:
          "What the query should actually do, e.g. 'list all secrets ordered by name'. Passed to the agent implementing it.",
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
    return {
      ...parsePackageName(getPackageName(cwd), {
        requiredSuffix: "-sdk",
        silentError: true, // so checklists/dry-runs don't error
      }),
      // Keep pathResult.targetDir (…/requests/<group>) — templates share one
      // stub dir so sharedPrefix has no `requests/<group>` segment to restore.
      ...pathResult,
      queryName: pathResult.targetName,
      urlPath: input.urlPath,
      method: input.method,
      prompt: input.prompt,
    };
  },

  steps: [
    step<CopyStepInput, AddQueryContext>("copy", runCopyStep, ({ context }) => {
      const lineReplace = makeLineReplace(context);
      return {
        templateFiles: {
          indexFakes: path.join(requestDir, "index.fakes.ts"),
          mocks: path.join(requestDir, "mocks.ts"),
          templateFile: path.join(requestDir, "__query-name__.ts"),
          templateFileFake: path.join(requestDir, "__query-name__.fake.ts"),
          templateFileTest: path.join(requestDir, "__query-name__.test.ts"),
        },
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace: (line: string) => {
          let out = line;
          // Keep `baseHandler` — sdk packages export that name; only remap the
          // golden spec package to this package's sibling spec.
          out = out.split("@saflib/base-spec").join(`${context.sharedPackagePrefix}-spec`);
          return lineReplace(out);
        },
      };
    }),

    step<UpdateStepInput, AddQueryContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "templateFile",
      prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}Update **${context.targetName}.ts** to implement the API query.

      Please review documentation here first: ${overviewDoc}`,
    })),

    step<PromptStepInput, AddQueryContext>("prompt", runPromptStep, ({ context }) => ({
      prompt: `Update **${context.targetName}.fake.ts** to implement the fake handler for testing.

Mainly it should reflect what is given to it. Have it respect query parameters and request bodies. Don't bother doing validation.

**Mock data**: Define shared mock data arrays in **mocks.ts** (adjacent to this file).
If this is a list query, define the array there (e.g. \`export const mock${context.groupName}: ...\`).
If this query reads from an existing list (e.g. a get-by-id), import the array from \`./mocks.ts\`.
This way operations affect one another (like creating or deleting resources) so that TanStack caching can be tested.
Seed mock rows with factories from product \`*-test\` packages when those exist (\`@scope/<product>-test/factories/*\` / \`@scope/<product>-<offshoot>-test/factories/*\`) instead of hand-building large empty objects.

As part of this, also update **${context.targetName}.test.ts** to implement simple tests for the API query.

Include:
* One test that makes sure it works at all.`,
    })),

    step<CommandStepInput, AddQueryContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<CommandStepInput, AddQueryContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default AddSdkQueryWorkflowDefinition;
