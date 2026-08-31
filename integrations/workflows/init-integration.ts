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
  getPackageName,
} from "@saflib/workflows";
import { templatesProductRoot } from "@saflib/templates";
import path from "node:path";
import { existsSync } from "node:fs";

const integrationStubRoot = path.join(
  templatesProductRoot,
  "service/integrations/__integration-name__",
);
const dependenciesLive = path.join(
  templatesProductRoot,
  "service/common/dependencies.ts",
);

const input = [
  {
    name: "name",
    description:
      "Kebab-case integration name (e.g. 'stripe'). Creates service/integrations/{name} and weaves configure into common/dependencies.",
    exampleValue: "stripe",
  },
] as const;

interface InitIntegrationContext extends ParsePackageNameOutput {
  integrationName: string;
  targetDir: string;
  parentDir: string;
  productRoot: string;
}

export const InitIntegrationWorkflowDefinition = defineWorkflow<
  typeof input,
  InitIntegrationContext
>({
  id: "integrations/init",

  description:
    "Initialize a third-party integration from the base stub and weave configure into service dependencies",

  checklistDescription: ({ packageName }) =>
    `Initialize ${packageName} integration package.`,

  input,

  sourceUrl: import.meta.url,

  versionControl: {
    allowPaths: ["./env.ts", "./secrets.json"],
  },

  context: ({ input }) => {
    const integrationName = input.name;
    const parentDir = path.resolve(
      input.cwd,
      path.join("service", "common"),
    );
    const productRoot = path.dirname(path.dirname(parentDir));
    const targetDir = path.join(
      productRoot,
      "service",
      "integrations",
      integrationName,
    );

    let org = "saflib";
    let productName = path.basename(productRoot);
    if (existsSync(path.join(parentDir, "package.json"))) {
      const parsed = parsePackageName(getPackageName(parentDir), {
        requiredSuffix: "-service-common",
        silentError: true,
      });
      if (parsed.organizationName) org = parsed.organizationName;
      if (parsed.serviceName) productName = parsed.serviceName;
    }

    const packageName = `@${org}/${productName}-${integrationName}-integration`;

    return {
      ...parsePackageName(packageName),
      integrationName,
      targetDir,
      parentDir,
      productRoot,
      serviceName: productName,
    };
  },

  templateFiles: {
    packageJson: path.join(integrationStubRoot, "package.json"),
    secrets: path.join(integrationStubRoot, "secrets.json"),
    envFile: path.join(integrationStubRoot, "env.ts"),
    client: path.join(integrationStubRoot, "client.ts"),
    clientMocks: path.join(integrationStubRoot, "client.mocks.ts"),
    index: path.join(integrationStubRoot, "index.ts"),
    test: path.join(integrationStubRoot, "index.test.ts"),
    tsconfig: path.join(integrationStubRoot, "tsconfig.json"),
    vitestConfig: path.join(integrationStubRoot, "vitest.config.js"),
    callsPing: path.join(integrationStubRoot, "calls/ping.ts"),
    binPing: path.join(integrationStubRoot, "bin/ping.ts"),
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
        // Expansion stubs belong to integrations/add-call.
        skipSourceGlobs: ["**/__target-name__*"],
        lineReplace: (line: string) => {
          let result = line;
          result = result
            .split("@saflib/base-__integration-name__-integration")
            .join(context.packageName);
          return baseReplace(result);
        },
      };
    }),

    step(CopyStepMachine, ({ context }) => {
      const baseReplace = makeLineReplace(context);
      return {
        name: context.integrationName,
        targetDir: context.parentDir,
        templateFiles: {
          dependencies: dependenciesLive,
        },
        lineReplace: (line: string) => {
          let result = line;
          result = result
            .split("@saflib/base-__integration-name__-integration")
            .join(context.packageName);
          return baseReplace(result);
        },
      };
    }),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "touch",
      args: [".env"],
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Install the SDK package for the **${context.integrationName}** integration and declare its secrets.

Read the overview doc first: ${context.docFiles?.overview}

1. Install the appropriate SDK npm package as a dependency (e.g. \`npm install some-sdk\`). If the integration doesn't need a dedicated SDK, skip this.
2. Update API key / credential names in \`secrets.json\`. Rename or add entries as needed. Sentinel \`"mock"\` selects the in-memory mock client.
3. Describe each secret clearly in its \`"description"\` field.
4. Only add \`env.schema.json\` later if you need non-secret config (feature flags, recording mode, etc.), then run \`npm exec saf-env generate\`.`,
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
2. Keep fetching credentials via \`store.getSecretByName(...)\` and \`secrets.json\` (already wired). Update the secret name if you renamed it in \`secrets.json\`.
3. **Do not change the configure / isMocked pattern** (test mode mocks; missing secret warns; \`"mock"\` sentinel selects mocks). See the docs for why.
4. Define a scoped client type using \`Pick\` to select only the SDK methods this integration will use. For nested SDKs, pick from each namespace. See the docs for patterns.
5. Implement the **mock client** in \`client.mocks.ts\` (already imported). Put all mock data and mock method implementations there — keep \`client.mocks.ts\` **SDK-free** (\`import type\` only from the vendor package). Tests import mocks via \`@<package>/mocks\`.
6. For SDK-backed integrations, split real SDK wiring into \`client.real.ts\` and wire production configure from the product's \`dependencies.integrations.ts\` (see existing integration packages in the monorepo).
7. Implement the **real client** by initialising the SDK and casting it to the scoped type.
8. Update the export name and types.`,
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
