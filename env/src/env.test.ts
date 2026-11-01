import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import type { MonorepoContext } from "@saflib/monorepo/workspace";
import {
  getDirectEnvParents,
  envSchemaTypeName,
  envTypeImportPath,
  kebabCaseToPascalCase,
  makeEnvParserSnippet,
  type SimplifiedJSONSchema,
} from "./env.ts";

describe("envSchemaTypeName", () => {
  it("derives the interface name from the package name", () => {
    expect(envSchemaTypeName("@saflib/env")).toBe("EnvEnvSchema");
    expect(envSchemaTypeName("@saflib/sentry")).toBe("SentryEnvSchema");
    expect(envSchemaTypeName("@acme/billing-admin-clients")).toBe(
      "BillingAdminClientsEnvSchema",
    );
  });
});

describe("kebabCaseToPascalCase", () => {
  it("converts kebab segments", () => {
    expect(kebabCaseToPascalCase("billing-admin-clients")).toBe(
      "BillingAdminClients",
    );
  });
});

describe("makeEnvParserSnippet", () => {
  const localSchema: SimplifiedJSONSchema = {
    type: "object",
    properties: {
      SENTRY_DSN: {
        type: "string",
        description: "Sentry DSN",
        source: "@saflib/sentry",
      },
    },
    required: [],
    additionalProperties: false,
  };

  it("emits imports and extends for parents with only local props in the body", async () => {
    const snippet = await makeEnvParserSnippet(localSchema, "@saflib/sentry", [
      "@saflib/env",
    ]);

    expect(snippet).toContain(
      `import type { EnvEnvSchema } from "${envTypeImportPath("@saflib/env")}";`,
    );
    expect(snippet).toContain(
      "export interface SentryEnvSchema extends EnvEnvSchema {",
    );
    expect(snippet).toContain("SENTRY_DSN?");
    expect(snippet).not.toContain("ALLOW_DB_CREATION");
    expect(snippet).not.toContain("DOMAIN:");
    expect(snippet).toContain(
      "export const typedEnv = (globalThis.process ? process.env : {}) as unknown as SentryEnvSchema;",
    );
  });

  it("keeps a stable type name when json-schema-to-typescript would sanitize it", async () => {
    const snippet = await makeEnvParserSnippet(
      {
        type: "object",
        properties: {
          __INTEGRATION_NAME___API_KEY: {
            type: "string",
            description: "The API key",
            source: "@saflib/base-__integration-name__-integration",
          },
        },
        required: [],
        additionalProperties: false,
      },
      "@saflib/base-__integration-name__-integration",
      ["@saflib/env"],
    );

    expect(snippet).toContain(
      "export interface Base__integrationName__IntegrationEnvSchema extends EnvEnvSchema {",
    );
    expect(snippet).toContain(
      "as unknown as Base__integrationName__IntegrationEnvSchema;",
    );
    expect(snippet).not.toContain("Base_IntegrationName__IntegrationEnvSchema");
  });

  it("emits an empty extending interface when there are no local props", async () => {
    const empty: SimplifiedJSONSchema = {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    };
    const snippet = await makeEnvParserSnippet(empty, "@saflib/vite", [
      "@saflib/env",
    ]);

    expect(snippet).toContain(
      `import type { EnvEnvSchema } from "${envTypeImportPath("@saflib/env")}";`,
    );
    expect(snippet).toContain(
      "export interface ViteEnvSchema extends EnvEnvSchema {}",
    );
  });

  it("omits imports and extends when there are no parents", async () => {
    const snippet = await makeEnvParserSnippet(
      {
        type: "object",
        properties: {
          DOMAIN: {
            type: "string",
            description: "Root domain",
            source: "@saflib/env",
          },
        },
        required: ["DOMAIN"],
        additionalProperties: false,
      },
      "@saflib/env",
      [],
    );

    expect(snippet).not.toContain("import type");
    expect(snippet).toContain("export interface EnvEnvSchema {");
    expect(snippet).not.toMatch(/export interface EnvEnvSchema extends/);
    expect(snippet).toContain("DOMAIN:");
  });
});

describe("getDirectEnvParents", () => {
  function makeContext(
    graph: Record<string, string[]>,
    withEnvFiles: string[],
  ): MonorepoContext {
    const root = mkdtempSync(path.join(tmpdir(), "saf-env-parents-"));
    const directories: Record<string, string> = {};
    for (const name of Object.keys(graph)) {
      const dir = path.join(root, name.replace("/", "__"));
      mkdirSync(dir);
      if (withEnvFiles.includes(name)) {
        writeFileSync(path.join(dir, "env.schema.json"), "{}");
      }
      directories[name] = dir;
    }
    return {
      workspaceDependencyGraph: graph,
      monorepoPackageDirectories: directories,
    } as unknown as MonorepoContext;
  }

  it("looks through dependencies without env files", () => {
    const context = makeContext(
      {
        "@x/monolith": ["@x/service", "@x/db"],
        "@x/service": ["@x/db"],
        "@x/db": ["@x/drizzle"],
        "@x/drizzle": [],
      },
      ["@x/monolith", "@x/service", "@x/drizzle"],
    );
    expect(getDirectEnvParents("@x/monolith", context)).toEqual([
      "@x/drizzle",
      "@x/service",
    ]);
  });

  it("stops at the nearest dependency with env files", () => {
    const context = makeContext(
      {
        "@x/app": ["@x/service"],
        "@x/service": ["@x/drizzle"],
        "@x/drizzle": [],
      },
      ["@x/service", "@x/drizzle"],
    );
    expect(getDirectEnvParents("@x/app", context)).toEqual(["@x/service"]);
  });
});
