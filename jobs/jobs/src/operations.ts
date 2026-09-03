import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import { assertOpenApiOperationTags, type OpenApiDocument } from "@saflib/openapi";
import {
  BACKGROUND_TAG,
  CRON_TRIGGER_PREFIX,
  TIMEOUT_CEILING_MS,
} from "./constants.ts";
import type {
  JobOperationConfigMap,
  OperationMap,
  ResolvedOperation,
  TriggerMap,
} from "./types.ts";

/** True when a trigger-map key is a cron schedule source (`cron:{jobName}`). */
export function isCronTriggerKey(key: string): boolean {
  return key.startsWith(CRON_TRIGGER_PREFIX);
}

/** Trigger-map / assertion callingOperationId for a cron job name. */
export function cronTriggerKey(jobName: string): string {
  return `${CRON_TRIGGER_PREFIX}${jobName}`;
}

/**
 * Product-side check: every `cron:` trigger-map key names a registered cron
 * job, and every registered cron job has a `cron:` trigger-map entry.
 * Call at service startup with `Object.keys(jobsMap)` (no `@saflib/cron-http` import).
 */
export function validateCronTriggerKeys(
  triggerMap: TriggerMap,
  cronJobNames: Iterable<string>,
): void {
  const names = new Set(cronJobNames);
  const errors: string[] = [];

  for (const key of Object.keys(triggerMap)) {
    if (!isCronTriggerKey(key)) {
      continue;
    }
    const jobName = key.slice(CRON_TRIGGER_PREFIX.length);
    if (!names.has(jobName)) {
      errors.push(
        `trigger map key "${key}" has no matching cron job "${jobName}"`,
      );
    }
  }

  for (const jobName of names) {
    const key = cronTriggerKey(jobName);
    if (!(key in triggerMap)) {
      errors.push(
        `cron job "${jobName}" has no trigger map key "${key}"`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Cron trigger map validation failed:\n- ${errors.join("\n- ")}`,
    );
  }
}

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
 * Walk a bundled OpenAPI document and map every `operation_id` to its HTTP
 * method, path template, and whether it carries the `background` tag.
 */
export function buildOperationMap(apiSpec: OpenApiDocument): OperationMap {
  assertOpenApiOperationTags(apiSpec);
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
      const operation_id = operation.operationId;
      if (typeof operation_id !== "string" || operation_id.length === 0) {
        continue;
      }

      const tags = operation.tags ?? [];
      map.set(operation_id, {
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
  operations: OperationMap | OpenApiDocument;
}

/**
 * Startup validation for the trigger map and per-operation config.
 * Throws on unknown ids, missing `background` tags, or timeout ceiling breaches.
 */
function isOperationMap(
  value: OperationMap | OpenApiDocument,
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
    if (!isCronTriggerKey(caller) && !operations.has(caller)) {
      errors.push(`trigger map key "${caller}" is not a known operation_id`);
    }
    for (const target of targets) {
      const resolved = operations.get(target);
      if (!resolved) {
        errors.push(
          `trigger map target "${target}" (from "${caller}") is not a known operation_id`,
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

  for (const [operation_id, config] of Object.entries(
    params.operationConfig ?? {},
  )) {
    if (!operations.has(operation_id)) {
      errors.push(
        `operationConfig key "${operation_id}" is not a known operation_id`,
      );
    }
    if (
      config.timeoutMs !== undefined &&
      config.timeoutMs > TIMEOUT_CEILING_MS
    ) {
      errors.push(
        `operationConfig "${operation_id}" timeoutMs ${config.timeoutMs} exceeds ceiling ${TIMEOUT_CEILING_MS}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Jobs startup validation failed:\n- ${errors.join("\n- ")}`,
    );
  }
}
