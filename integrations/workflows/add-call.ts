import {
  CopyStepMachine,
  UpdateStepMachine,
  TransformFileStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
} from "@saflib/workflows";
import { existsSync } from "node:fs";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "Path of the new call (e.g., './calls/parse-file.ts')",
    exampleValue: "./calls/example-call.ts",
  },
] as const;

interface AddCallContext extends ParsePathOutput, ParsePackageNameOutput {
  integrationName: string;
}

export const AddCallWorkflowDefinition = defineWorkflow<
  typeof input,
  AddCallContext
>({
  id: "integrations/add-call",

  description:
    "Add a new call to an integration package with implementation, mock, and bin script",

  checklistDescription: ({ targetName }) =>
    `Add ${targetName} call to the integration.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    let packageName = "@mock/package-integration";
    if (existsSync(path.join(input.cwd, "package.json"))) {
      packageName = getPackageName(input.cwd);
    }
    const integrationName = path.basename(input.cwd);
    return {
      ...parsePackageName(packageName, { silentError: true }),
      ...parsePath(input.path, {
        requiredPrefix: "./calls/",
        requiredSuffix: ".ts",
        cwd: input.cwd,
      }),
      integrationName,
      targetDir: input.cwd,
    };
  },

  templateFiles: {
    call: path.join(sourceDir, "calls/__target-name__.ts"),
    callMocks: path.join(sourceDir, "calls/__target-name__.mocks.ts"),
    bin: path.join(sourceDir, "bin/__target-name__.ts"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => {
      const baseReplace = makeLineReplace(context);
      return {
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace: (line: string) => {
          let result = line;
          if (result.includes("template-integration")) {
            result = result.replaceAll(
              "template-integration",
              context.packageName,
            );
          }
          return baseReplace(result);
        },
      };
    }),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "call",
      promptMessage: `Implement the **${context.targetName}** call in **${context.copiedFiles?.call}**.

Read the overview doc first: ${context.docFiles?.overview}

This call wraps the scoped client to provide product-specific functionality. It should:
1. Define a typed result interface for the response.
2. Add parameters if needed.
3. When \`isMocked\` is true, return the mock from \`${context.targetName}.mocks.ts\`.
4. When not mocked, use the scoped client to make the real API call and return the result.

See \`calls/parse-file.ts\` in the anthropic integration for an example of a complex call with validation and caching.`,
    })),

    step(UpdateStepMachine, () => ({
      fileId: "bin",
      promptMessage: `Update the bin script to call the implementation with appropriate test arguments. The script should demonstrate a realistic invocation so you can verify the call works end-to-end with \`npm run <script-name>\`.`,
    })),

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: "package.json",
      description: `Add "${context.targetName}" script to package.json`,
      transform: (content: string) => {
        const pkg = JSON.parse(content);
        pkg.scripts[context.targetName] =
          `node --env-file=.env --experimental-strip-types ./bin/${context.targetName}.ts`;
        return JSON.stringify(pkg, null, 2) + "\n";
      },
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});
