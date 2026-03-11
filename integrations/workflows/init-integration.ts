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
      "The npm package name for the integration (e.g., '@myorg/myapp-stripe')",
    exampleValue: "@example/example-integration",
  },
  {
    name: "path",
    description:
      "Relative path to the integration directory (e.g., 'services/integrations/stripe')",
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
    envFile: path.join(sourceDir, ".env"),
    client: path.join(sourceDir, "client.ts"),
    index: path.join(sourceDir, "index.ts"),
    test: path.join(sourceDir, "index.test.ts"),
    gitignore: path.join(sourceDir, ".gitignore"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    callsPing: path.join(sourceDir, "calls/ping.ts"),
    binPing: path.join(sourceDir, "bin/ping.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

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

Read the overview doc first: ${context.docFiles?.overview}

1. Install the appropriate SDK npm package as a dependency (e.g. \`npm install some-sdk\`). If the integration doesn't need a dedicated SDK, skip this.
2. Update the API key / credentials env variable(s) in \`env.schema.json\`. Rename or add variables as needed. Mark them as NOT required (the mock/test path should work without them).
3. Describe each variable clearly in its \`"description"\` field.
4. Update the env variable name in \`.env\` to match.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "client",
      promptMessage: `Update **client.ts** to implement the integration client.

Read the overview doc first: ${context.docFiles?.overview}

1. Import the installed SDK.
2. Read the correct API key env variable from \`typedEnv\` (matching what you set in env.schema.json). Update the variable name and error message if you renamed it.
3. **Do not change the two-gate pattern** (the \`if (!apiKey && !isTest)\` throw and the \`isMocked\` assignment). See the docs for why.
4. Define a scoped client type using \`Pick\` to select only the SDK methods this integration will use. For nested SDKs, pick from each namespace. See the docs for patterns.
5. Implement the **mock client** with realistic placeholder responses matching the picked methods.
6. Implement the **real client** by initialising the SDK and casting it to the scoped type.
7. Update the export name and types.`,
    })),

    step(UpdateStepMachine, () => ({
      fileId: "callsPing",
      promptMessage: `Update **calls/ping.ts** to make a real read-only API call through the scoped client.

Replace the placeholder implementation with a call to a safe SDK method (list, get, search — not create/update/delete). The function should import the client from \`../client.ts\` and return the API response.`,
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
