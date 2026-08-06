import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import { BACKGROUND_TAG, TIMEOUT_CEILING_MS } from "./constants.ts";
import type {
  JobOperationConfigMap,
  OperationMap,
  ResolvedOperation,
  TriggerMap,
} from "./types.ts";

const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const satisfies readonly (keyof OpenAPIV3.PathItemObject)[];

/**
 * Walk a bundled OpenAPI document and map every `operationId` to its HTTP
 * method, path template, and whether it carries the `background` tag.
 */
export function buildOperationMap(apiSpec: OpenAPIV3.DocumentV3): OperationMap {
  const map = new Map<string, ResolvedOperation>();

  for (const [pathTemplate, pathItem] of Object.entries(apiSpec.paths ?? {})) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") {
        continue;
      }
      const operationId = operation.operationId;
      if (typeof operationId !== "string" || operationId.length === 0) {
        continue;
      }

      const tags = operation.tags ?? [];
      map.set(operationId, {
        method: method.toUpperCase(),
        pathTemplate,
        isBackground: tags.includes(BACKGROUND_TAG),
      });
    }
  }

  return map;
}

export interface ValidateJobsStartupParams {
  triggerMap: TriggerMap;
  operationConfig?: JobOperationConfigMap;
  /**
   * Pre-built map, or the OpenAPI document to walk. Prefer passing a shared
   * `OperationMap` when the runtime will reuse it for delivery.
   */
  operations: OperationMap | OpenAPIV3.DocumentV3;
}

/**
 * Startup validation for the trigger map and per-operation config.
 * Throws on unknown ids, missing `background` tags, or timeout ceiling breaches.
 */
function isOperationMap(
  value: OperationMap | OpenAPIV3.DocumentV3,
): value is OperationMap {
  return !("paths" in value);
}

/**
 * Startup validation for the trigger map and per-operation config.
 * Throws on unknown ids, missing `background` tags, or timeout ceiling breaches.
 */
export function validateJobsStartup(params: ValidateJobsStartupParams): void {
  const operations = isOperationMap(params.operations)
    ? params.operations
    : buildOperationMap(params.operations);

  const errors: string[] = [];

  for (const [caller, targets] of Object.entries(params.triggerMap)) {
    if (!operations.has(caller)) {
      errors.push(`trigger map key "${caller}" is not a known operationId`);
    }
    for (const target of targets) {
      const resolved = operations.get(target);
      if (!resolved) {
        errors.push(
          `trigger map target "${target}" (from "${caller}") is not a known operationId`,
        );
        continue;
      }
      if (!resolved.isBackground) {
        errors.push(
          `trigger map target "${target}" (from "${caller}") is missing the "${BACKGROUND_TAG}" tag`,
        );
      }
    }
  }

  for (const [operationId, config] of Object.entries(
    params.operationConfig ?? {},
  )) {
    if (!operations.has(operationId)) {
      errors.push(
        `operationConfig key "${operationId}" is not a known operationId`,
      );
    }
    if (
      config.timeoutMs !== undefined &&
      config.timeoutMs > TIMEOUT_CEILING_MS
    ) {
      errors.push(
        `operationConfig "${operationId}" timeoutMs ${config.timeoutMs} exceeds ceiling ${TIMEOUT_CEILING_MS}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Jobs startup validation failed:\n- ${errors.join("\n- ")}`,
    );
  }
}
