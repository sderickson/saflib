import { existsSync } from "node:fs";
import path from "node:path";
import {
  defineWorkflow,
  step,
  runCopyStep,
  runUpdateStep,
  runTransformFileStep,
  runCommandStep,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  type CopyStepInput,
  type UpdateStepInput,
  type TransformFileStepInput,
  type CommandStepInput,
  type ParsePathOutput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot, templatesSaflibRoot } from "@saflib/templates";

const integrationStubRoot = path.join(
  templatesProductRoot,
  "service/integrations/__integration-name__",
);
const overviewDoc = path.join(templatesSaflibRoot, "integrations", "docs", "01-overview.md");

interface AddCallInput {
  /** Path of the new call (e.g., './calls/parse-file.ts'). */
  path: string;
}

interface AddCallContext extends ParsePathOutput, ParsePackageNameOutput {
  cwd: string;
  integrationName: string;
}

/**
 * Ported from `integrations/workflows/add-call.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const AddCallWorkflowDefinition = defineWorkflow<AddCallInput, AddCallContext>({
  id: "integrations/add-call",

  description: "Add a new call to an integration package with implementation, mock, and bin script",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path of the new call (e.g., './calls/parse-file.ts')",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
    let packageName = "@mock/package-integration";
    if (existsSync(path.join(cwd, "package.json"))) {
      packageName = getPackageName(cwd);
    }
    const integrationName = path.basename(cwd);
    return {
      ...parsePackageName(packageName, { silentError: true }),
      ...parsePath(input.path, {
        requiredPrefix: "./calls/",
        requiredSuffix: ".ts",
        cwd,
      }),
      integrationName,
      cwd,
    };
  },

  steps: [
    step<CopyStepInput, AddCallContext>("copy", runCopyStep, ({ context }) => {
      const baseReplace = makeLineReplace(context);
      return {
        templateFiles: {
          call: path.join(integrationStubRoot, "calls/__target-name__.ts"),
          callMocks: path.join(integrationStubRoot, "calls/__target-name__.mocks.ts"),
          bin: path.join(integrationStubRoot, "bin/__target-name__.ts"),
          index: path.join(integrationStubRoot, "index.ts"),
        },
        name: context.targetName,
        targetDir: context.cwd,
        lineReplace: (line: string) => {
          let result = line;
          if (result.includes("template-integration")) {
            result = result.replaceAll("template-integration", context.packageName);
          }
          result = result
            .split("@saflib/base-__integration-name__-integration")
            .join(context.packageName);
          return baseReplace(result);
        },
      };
    }),

    step<UpdateStepInput, AddCallContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "call",
      prompt: `Implement the **${context.targetName}** call.

Read the overview doc first: ${overviewDoc}

This call wraps the scoped client to provide product-specific functionality. It should:
1. Define a typed result interface for the response.
2. Add parameters if needed.
3. When \`isMocked\` is true, return the mock from \`${context.targetName}.mocks.ts\`.
4. When not mocked, use the scoped client to make the real API call and return the result.

See other integration packages in the monorepo for examples of complex calls with validation and caching.`,
    })),

    step<UpdateStepInput, AddCallContext>("update", runUpdateStep, () => ({
      fileId: "bin",
      prompt: `Update the bin script to call the implementation with appropriate test arguments. The script should demonstrate a realistic invocation so you can verify the call works end-to-end with \`npm run <script-name>\`.`,
    })),

    step<TransformFileStepInput, AddCallContext>(
      "transform-file",
      runTransformFileStep,
      ({ context }) => ({
        filePath: "package.json",
        description: `Add "${context.targetName}" script to package.json`,
        transform: (content: string) => {
          const pkg = JSON.parse(content);
          pkg.scripts[context.targetName] =
            `node --env-file=.env --experimental-strip-types ./bin/${context.targetName}.ts`;
          return JSON.stringify(pkg, null, 2) + "\n";
        },
      }),
    ),

    step<CommandStepInput, AddCallContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<CommandStepInput, AddCallContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default AddCallWorkflowDefinition;
