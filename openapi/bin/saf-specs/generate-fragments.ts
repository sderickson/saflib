import { getSafReporters } from "@saflib/node";
import { execFile } from "child_process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { promisify } from "util";
import { resolvePackageBin } from "./resolve-bin.ts";
import {
  collectOperationsFromBundled,
  type OpenApiDoc,
  sliceOperation,
} from "./slice-bundled-openapi.ts";

function writeOperationIndex(operationDir: string, operationId: string): void {
  writeFileSync(
    path.join(operationDir, "index.ts"),
    `import type { operations, components, paths } from "./openapi.d.ts";
import * as json from "./openapi.json" with { type: "json" };
import {
  castJson,
  type ExtractResponseBody,
  type ExtractRequestBody,
  type ExtractRequestPathParams,
  type ExtractRequestQueryParams,
} from "@saflib/openapi";

export type { operations, components, paths };

/** OpenAPI document for a single operation — use with createScopedMiddleware. */
export const operationJsonSpec = castJson(json);

export type ResponseBody = ExtractResponseBody<operations>;
export type RequestBody = ExtractRequestBody<operations>;
export type PathParams = ExtractRequestPathParams<operations>;
export type QueryParams = ExtractRequestQueryParams<operations>;

export const operationId = "${operationId}" as const;
`,
  );
}

function schemaTypeExportName(schemaName: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(schemaName)) {
    return schemaName;
  }
  const camel = schemaName.replace(/[-_]+([a-zA-Z0-9])/g, (_, c) =>
    c.toUpperCase(),
  );
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * OpenAPI bundles often expose the same schema under two keys that differ only
 * by casing (e.g. components `Error` plus a file ref that becomes `error`).
 * Emitting both `dist/schemas/Error` and `dist/schemas/error` breaks
 * `tsc` on case-sensitive filesystems (CI Linux). Keep one canonical name.
 */
export function canonicalSchemaFragmentNames(schemaNames: string[]): string[] {
  const byLower = new Map<string, string>();
  for (const name of [...schemaNames].sort((a, b) => a.localeCompare(b))) {
    const lower = name.toLowerCase();
    const existing = byLower.get(lower);
    if (!existing) {
      byLower.set(lower, name);
      continue;
    }
    // Prefer PascalCase component ids (OpenAPI convention) over filename-derived keys.
    const preferNew = /^[A-Z]/.test(name) && !/^[A-Z]/.test(existing);
    if (preferNew) {
      byLower.set(lower, name);
    }
  }
  return [...byLower.values()].sort((a, b) => a.localeCompare(b));
}

function writeSchemaIndex(schemaDir: string, schemaName: string): void {
  const typeName = schemaTypeExportName(schemaName);
  writeFileSync(
    path.join(schemaDir, "index.ts"),
    `import type { components } from "../../openapi.d.ts";

export type ${typeName} = components["schemas"]["${schemaName}"];
`,
  );
}

const execFileAsync = promisify(execFile);
const openapiTypescriptBin = resolvePackageBin("openapi-typescript");

async function runOpenApiTypegen(jsonPath: string, dtsPath: string): Promise<void> {
  await execFileAsync(openapiTypescriptBin, [jsonPath, "-o", dtsPath]);
}

async function runOpenApiTypegenPool(
  jobs: Array<{ jsonPath: string; dtsPath: string }>,
  concurrency = 16,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      await runOpenApiTypegen(job.jsonPath, job.dtsPath);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

export async function generateOperationFragments(outputDir: string): Promise<number> {
  const { log } = getSafReporters();
  const bundledJsonPath = path.join(outputDir, "openapi.json");
  const bundled = JSON.parse(readFileSync(bundledJsonPath, "utf8")) as OpenApiDoc;
  const entries = collectOperationsFromBundled(bundled);

  const operationsRoot = path.join(outputDir, "operations");
  mkdirSync(operationsRoot, { recursive: true });

  const operationDirs: string[] = [];

  for (const entry of entries) {
    const operationDir = path.join(operationsRoot, entry.operationId);
    mkdirSync(operationDir, { recursive: true });

    const slice = sliceOperation(
      bundled,
      entry.pathKey,
      entry.method,
      entry.operationId,
    );
    writeFileSync(
      path.join(operationDir, "openapi.json"),
      JSON.stringify(slice, null, 2),
    );
    writeOperationIndex(operationDir, entry.operationId);
    operationDirs.push(operationDir);
  }

  log.info(`Typegen for ${operationDirs.length} operation fragments...`);
  await runOpenApiTypegenPool(
    operationDirs.map((operationDir) => ({
      jsonPath: path.join(operationDir, "openapi.json"),
      dtsPath: path.join(operationDir, "openapi.d.ts"),
    })),
  );

  log.info(`Generated ${entries.length} operation fragments.`);
  return entries.length;
}

export function generateSchemaFragments(outputDir: string): number {
  const { log } = getSafReporters();
  const bundledJsonPath = path.join(outputDir, "openapi.json");
  const bundled = JSON.parse(readFileSync(bundledJsonPath, "utf8")) as OpenApiDoc;

  const schemaNames = canonicalSchemaFragmentNames(
    Object.keys(bundled.components?.schemas ?? {}),
  );
  const schemasRoot = path.join(outputDir, "schemas");
  mkdirSync(schemasRoot, { recursive: true });

  for (const schemaName of schemaNames) {
    const schemaDir = path.join(schemasRoot, schemaName);
    mkdirSync(schemaDir, { recursive: true });
    writeSchemaIndex(schemaDir, schemaName);
  }

  log.info(`Generated ${schemaNames.length} schema export stubs.`);
  return schemaNames.length;
}
