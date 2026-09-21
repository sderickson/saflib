import { existsSync } from "node:fs";
import path from "node:path";
import {
  defineWorkflow,
  step,
  makeLineReplace,
  parsePackageName,
  getPackageName,
  runCopyStep,
  runUpdateStep,
  runPromptStep,
  runCommandStep,
  runCdStep,
  type CopyStepInput,
  type UpdateStepInput,
  type PromptStepInput,
  type CommandStepInput,
  type CdStepInput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot, templatesSaflibRoot } from "@saflib/templates";

const integrationStubRoot = path.join(
  templatesProductRoot,
  "service/integrations/__integration-name__",
);
const dependenciesLive = path.join(
  templatesProductRoot,
  "service/common/dependencies.ts",
);
const overviewDoc = path.join(templatesSaflibRoot, "integrations", "docs", "01-overview.md");

/** Expected shape: `{product}/service/integrations/{name}` (relative to cwd / monorepo root). */
const INTEGRATION_PATH_RE =
  /^(?<product>.+)\/service\/integrations\/(?<name>[^/]+)\/?$/;

interface InitIntegrationInput {
  /**
   * Path of the new integration package from the monorepo root, e.g.
   * `power-up/service/integrations/mercury`.
   */
  path: string;
}

interface InitIntegrationContext extends ParsePackageNameOutput {
  integrationName: string;
  targetDir: string;
  parentDir: string;
  productRoot: string;
  /** Repo-relative path of the integration package. */
  path: string;
  cwd: string;
}

function resolveIntegrationPath(
  rawPath: string,
  cwd: string,
): { integrationName: string; productRoot: string; targetDir: string; parentDir: string } {
  const normalized = rawPath.replace(/^\.\//, "").replace(/\/$/, "");
  const match = INTEGRATION_PATH_RE.exec(normalized);
  if (!match?.groups) {
    throw new Error(
      `integrations/init path must look like "{product}/service/integrations/{name}" (got "${rawPath}")`,
    );
  }
  const productRoot = path.resolve(cwd, match.groups.product);
  const integrationName = match.groups.name;
  return {
    integrationName,
    productRoot,
    targetDir: path.join(productRoot, "service", "integrations", integrationName),
    parentDir: path.join(productRoot, "service", "common"),
  };
}

/**
 * Ported from `integrations/workflows/init-integration.ts` — scaffolds
 * `{product}/service/integrations/{name}` from the base stub and weaves
 * `configure{Name}()` into `service/common/dependencies.ts`.
 *
 * Call from the monorepo root with a full product-relative path (do not
 * `cd` into `service/common` first).
 */
export const InitIntegrationWorkflowDefinition = defineWorkflow<
  InitIntegrationInput,
  InitIntegrationContext
>({
  id: "integrations/init",

  description:
    "Initialize a third-party integration from the base stub and weave configure into service dependencies",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Path of the new integration from the monorepo root, e.g. 'power-up/service/integrations/mercury'.",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
    const { integrationName, productRoot, targetDir, parentDir } =
      resolveIntegrationPath(input.path, cwd);

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
      path: input.path.replace(/^\.\//, "").replace(/\/$/, ""),
      serviceName: productName,
      cwd,
    };
  },

  steps: [
    step<CopyStepInput, InitIntegrationContext>("copy", runCopyStep, ({ context }) => {
      const baseReplace = makeLineReplace(context);
      return {
        templateFiles: {
          packageJson: path.join(integrationStubRoot, "package.json"),
          secrets: path.join(integrationStubRoot, "secrets.json"),
          envFile: path.join(integrationStubRoot, "env.ts"),
          client: path.join(integrationStubRoot, "client.ts"),
          clientMocks: path.join(integrationStubRoot, "mocks/client.ts"),
          index: path.join(integrationStubRoot, "index.ts"),
          test: path.join(integrationStubRoot, "test/index.test.ts"),
          tsconfig: path.join(integrationStubRoot, "tsconfig.json"),
          vitestConfig: path.join(integrationStubRoot, "vitest.config.js"),
          callsPing: path.join(integrationStubRoot, "calls/ping.ts"),
          binPing: path.join(integrationStubRoot, "bin/ping.ts"),
        },
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

    step<CopyStepInput, InitIntegrationContext>("copy", runCopyStep, ({ context }) => {
      const baseReplace = makeLineReplace(context);
      return {
        templateFiles: {
          dependencies: dependenciesLive,
        },
        name: context.integrationName,
        targetDir: context.parentDir,
        lineReplace: (line: string) => {
          let result = line;
          result = result
            .split("@saflib/base-__integration-name__-integration")
            .join(context.packageName);
          return baseReplace(result);
        },
      };
    }),

    step<CdStepInput, InitIntegrationContext>("cd", runCdStep, ({ context }) => ({
      path: context.targetDir,
    })),

    step<CommandStepInput, InitIntegrationContext>("command", runCommandStep, () => ({
      command: "touch",
      args: [".env"],
    })),

    step<PromptStepInput, InitIntegrationContext>("prompt", runPromptStep, ({ context }) => ({
      prompt: `Install the SDK package for the **${context.integrationName}** integration and declare its secrets.

Read the overview doc first: ${overviewDoc}

1. Install the appropriate SDK npm package as a dependency of \`${context.packageName}\` (e.g. \`npm install some-sdk -w ${context.packageName}\`). If the integration doesn't need a dedicated SDK, skip this.
2. Add \`${context.packageName}\` as a dependency of \`${context.parentDir}/package.json\` and a project reference in that package's \`tsconfig.json\` (path \`../integrations/${context.integrationName}\`).
3. Update API key / credential names in \`secrets.json\`. Rename or add entries as needed. Sentinel \`"mock"\` selects the in-memory mock client.
4. Describe each secret clearly in its \`"description"\` field.
5. Only add \`env.schema.json\` later if you need non-secret config (feature flags, recording mode, etc.), then run \`npm exec saf-env generate\`.`,
    })),

    step<CommandStepInput, InitIntegrationContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
    })),

    step<CommandStepInput, InitIntegrationContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install"],
    })),

    step<UpdateStepInput, InitIntegrationContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "client",
      prompt: `Update **client.ts** to implement the integration client.

Read the overview doc first: ${overviewDoc}

1. Import the installed SDK (if any).
2. Keep fetching credentials via \`store.getSecretByName(...)\` and \`secrets.json\` (already wired). Update the secret name if you renamed it in \`secrets.json\`.
3. **Do not change the configure / isMocked pattern** (test mode mocks; missing secret warns; \`"mock"\` sentinel selects mocks). See the docs for why.
4. Define a scoped client type using \`Pick\` to select only the SDK methods this integration will use. For nested SDKs, pick from each namespace. See the docs for patterns.
5. Implement the **mock client** in \`mocks/client.ts\` (already imported). Put all mock data and mock method implementations there — keep \`mocks/client.ts\` **SDK-free** (\`import type\` only from the vendor package). Tests import mocks via \`@<package>/mocks\`.
6. Implement the **real client** by initialising the SDK (or fetch wrapper) and casting it to the scoped type.
7. Update the export name and types.`,
    })),

    step<UpdateStepInput, InitIntegrationContext>("update", runUpdateStep, () => ({
      fileId: "callsPing",
      prompt: `Update **calls/ping.ts** to make a real read-only API call through the scoped client.

Replace the placeholder implementation with a call to a safe SDK method (list, get, search — not create/update/delete). The function should import the client from \`../client.ts\` and return the API response.`,
    })),

    step<CommandStepInput, InitIntegrationContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<CommandStepInput, InitIntegrationContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default InitIntegrationWorkflowDefinition;
