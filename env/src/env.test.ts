import { describe, expect, it } from "vitest";
import {
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
    expect(envSchemaTypeName("@pathclerk/daemon-admin-clients")).toBe(
      "DaemonAdminClientsEnvSchema",
    );
  });
});

describe("kebabCaseToPascalCase", () => {
  it("converts kebab segments", () => {
    expect(kebabCaseToPascalCase("daemon-admin-clients")).toBe(
      "DaemonAdminClients",
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
