import {
  CopyStepMachine,
  PromptStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  CdStepMachine,
  step,
  defineWorkflow,
  makeLineReplace,
  parsePackageName,
  type ParsePackageNameOutput,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "The npm package name for the integration (e.g., '@vendata/iform-anthropic')",
    exampleValue: "@example/example-integration",
  },
  {
    name: "path",
    description:
      "Relative path to the integration directory (e.g., 'iform/service/integrations/anthropic')",
    exampleValue: "services/integrations/example-integration",
  },
] as const;

interface InitIntegrationContext extends ParsePackageNameOutput {
  integrationName: string;
  targetDir: string;
}

export const InitIntegrationWorkflowDefinition = defineWorkflow<
  typeof input,
  InitIntegrationContext
>({
  id: "integrations/init",

  description:
    "Initialize a new third-party integration package with client, env schema, mock, and test script",

  checklistDescription: ({ packageName }) =>
    `Initialize ${packageName} integration package.`,

  input,

  sourceUrl: import.meta.url,

  versionControl: {
    allowPaths: ["./env.ts"],
  },

  context: ({ input }) => {
    const pathParts = input.path.split("/").filter(Boolean);
    const integrationName = pathParts[pathParts.length - 1];
    return {
      ...parsePackageName(input.name),
      integrationName,
      targetDir: path.join(input.cwd, input.path),
    };
  },

  templateFiles: {
    packageJson: path.join(sourceDir, "package.json"),
    envSchema: path.join(sourceDir, "env.schema.json"),
    client: path.join(sourceDir, "client.ts"),
    index: path.join(sourceDir, "index.ts"),
    test: path.join(sourceDir, "index.test.ts"),
    gitignore: path.join(sourceDir, ".gitignore"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => {
      const baseReplace = makeLineReplace(context);
      return {
        name: context.integrationName,
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

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Install the SDK package for the **${context.integrationName}** integration and configure environment variables.

1. Install the appropriate SDK npm package as a dependency (e.g. \`npm install @anthropic-ai/sdk\`). If the integration doesn't need a dedicated SDK, skip this.
2. Add or update environment variables that are required for the integration to \`env.schema.json\`. Use descriptive names like \`ANTHROPIC_API_KEY\` or \`DOCUMENT_AI_CREDENTIALS\`. Mark them as NOT required (the mock/test path should work without them).
3. Describe each variable clearly in its \`"description"\` field.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(UpdateStepMachine, () => ({
      fileId: "client",
      promptMessage: `Update **client.ts** to implement the integration client.

1. Import the installed SDK.
2. Read the correct API key env variable from \`typedEnv\` (matching what you added to env.schema.json).
3. Define \`ScopedClient\` type — only expose the SDK methods this integration will use. Keep the type surface minimal.
4. Implement the **mock client** with realistic placeholder responses.
5. Implement the **real client** by initialising the SDK and mapping it to the scoped type.
6. Update the export name and types.

Reference existing integrations for style: both the anthropic and gcloud integrations define a \`Scoped*Client\` type and branch on \`isMocked\`.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Create a test call, bin script, and npm run-script for the **${context.integrationName}** integration.

1. Create a \`calls/\` directory and add a test call file (e.g. \`calls/ping.ts\` or \`calls/list.ts\`). It should:
   - Import the client from \`../client.ts\`.
   - Call a safe, read-only API method (list, fetch, or ping — not create/update/delete).
   - Export a function that returns the result.

2. Create a \`bin/\` directory with a script (e.g. \`bin/ping.ts\`) that:
   - Imports and calls the function from the calls file.
   - Logs the result with \`console.log(JSON.stringify(result, null, 2))\`.

3. Add an npm script to \`package.json\` that runs the bin script:
   \`"ping": "node --env-file=.env --experimental-strip-types ./bin/ping.ts"\`

4. Update \`index.ts\` to also export the new call function.

5. Update \`index.test.ts\` to call the function and verify it returns a value (it will use the mock client in tests).`,
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
