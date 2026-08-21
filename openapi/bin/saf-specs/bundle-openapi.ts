import { bundle, loadConfig } from "@redocly/openapi-core";
import { writeFileSync } from "node:fs";
import type { OpenApiDoc } from "./slice-bundled-openapi.ts";

/**
 * Bundle an OpenAPI document into one JSON file with external `$ref`s promoted
 * into `components` (Redocly-compatible). Uses `@redocly/openapi-core` — the
 * same engine openapi-typescript already depends on — not the Redocly CLI.
 */
export async function bundleOpenApiToJson(
  entryPath: string,
  outputJsonPath: string,
): Promise<OpenApiDoc> {
  const config = await loadConfig({});
  const result = await bundle({
    ref: entryPath,
    config,
    dereference: false,
  });
  const bundled = result.bundle.parsed as OpenApiDoc;
  writeFileSync(outputJsonPath, `${JSON.stringify(bundled, null, 2)}\n`);
  return bundled;
}
