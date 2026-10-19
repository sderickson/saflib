import { getSafReporters } from "@saflib/node";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import {
  collectOperationsFromBundled,
  type OpenApiDoc,
} from "../../slice-operation.ts";

function writeOperationIndex(operationDir: string, operationId: string): void {
  writeFileSync(
    path.join(operationDir, "index.ts"),
    `import type {
  operations as AllOperations,
  components,
  paths,
} from "../../openapi.d.ts";
import { jsonSpec } from "../../json-spec.ts";
import { sliceOperationById } from "@saflib/openapi/slice-operation";
import type {
  ExtractResponseBody,
  ExtractRequestBody,
  ExtractRequestPathParams,
  ExtractRequestQueryParams,
} from "@saflib/openapi";

export const operationId = "${operationId}" as const;

export type operations = Pick<AllOperations, typeof operationId>;
export type { components, paths };

/** OpenAPI document for a single operation — use with createScopedMiddleware. */
export const operationJsonSpec = sliceOperationById(jsonSpec, operationId);

export type ResponseBody = ExtractResponseBody<operations>;
export type RequestBody = ExtractRequestBody<operations>;
export type PathParams = ExtractRequestPathParams<operations>;
export type QueryParams = ExtractRequestQueryParams<operations>;
`,
  );
}

export function schemaTypeExportName(schemaName: string): string {
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

function writeSchemaIndex(
  schemaDir: string,
  schemaName: string,
  external?: { packageName: string; schemaName: string },
): void {
  const typeName = schemaTypeExportName(schemaName);
  if (external) {
    const exportName = schemaTypeExportName(external.schemaName);
    const line =
      exportName === typeName
        ? `export type { ${exportName} } from "${external.packageName}/schemas/${external.schemaName}";\n`
        : `export type { ${exportName} as ${typeName} } from "${external.packageName}/schemas/${external.schemaName}";\n`;
    writeFileSync(path.join(schemaDir, "index.ts"), line);
    return;
  }
  writeFileSync(
    path.join(schemaDir, "index.ts"),
    `import type { components } from "../../openapi.d.ts";

export type ${typeName} = components["schemas"]["${schemaName}"];
`,
  );
}

/**
 * One module per operation. Each slices its operation out of the package's
 * complete document when imported, so no per-operation JSON is generated.
 */
export function generateOperationFragments(
  outputDir: string,
  bundled: OpenApiDoc,
): number {
  const { log } = getSafReporters();
  const entries = collectOperationsFromBundled(bundled);
  const operationsRoot = path.join(outputDir, "operations");
  mkdirSync(operationsRoot, { recursive: true });
  for (const entry of entries) {
    const operationDir = path.join(operationsRoot, entry.operationId);
    mkdirSync(operationDir, { recursive: true });
    writeOperationIndex(operationDir, entry.operationId);
  }
  log.info(`Generated ${entries.length} operation fragments.`);
  return entries.length;
}

export function generateSchemaFragments(
  outputDir: string,
  bundled: OpenApiDoc,
  externalSchemas: Map<
    string,
    { packageName: string; schemaName: string }
  > = new Map(),
): number {
  const { log } = getSafReporters();

  // Schemas owned by another package get no stub here: import them from the
  // owning package. (This package's openapi.d.ts still references them.)
  const schemas = bundled.components?.schemas ?? {};
  // A named component that is only `$ref: "#/components/schemas/<file-key>"`
  // (e.g. `BacklogItem` → `backlog-item`) is the same type; stub just the name.
  const aliasedKeys = new Set<string>();
  for (const [name, schema] of Object.entries(schemas)) {
    const ref = (schema as { $ref?: unknown } | undefined)?.$ref;
    if (
      typeof ref === "string" &&
      Object.keys(schema as object).length === 1 &&
      /^[A-Z]/.test(name)
    ) {
      const m = /^#\/components\/schemas\/(.+)$/.exec(ref);
      if (m && m[1] !== name) aliasedKeys.add(m[1]!);
    }
  }
  const schemaNames = canonicalSchemaFragmentNames(Object.keys(schemas)).filter(
    (name) => !externalSchemas.has(name) && !aliasedKeys.has(name),
  );
  const schemasRoot = path.join(outputDir, "schemas");
  mkdirSync(schemasRoot, { recursive: true });

  for (const schemaName of schemaNames) {
    const schemaDir = path.join(schemasRoot, schemaName);
    mkdirSync(schemaDir, { recursive: true });
    writeSchemaIndex(schemaDir, schemaName, externalSchemas.get(schemaName));
  }

  log.info(`Generated ${schemaNames.length} schema export stubs.`);
  return schemaNames.length;
}
