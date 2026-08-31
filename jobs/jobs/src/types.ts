import type { DbKey, DbOptions } from "@saflib/drizzle";
import type { OpenApiDocument } from "@saflib/openapi";

/**
 * Calling operation_id → operationIds it may enqueue.
 * Reviewable contract enforced on every enqueue and validated at startup.
 */
export type TriggerMap = Record<string, readonly string[]>;

/**
 * Optional per-target-operation overrides. All fields optional; defaults come
 * from `src/constants.ts`.
 */
export interface JobOperationConfig {
  /** Per-attempt delivery timeout; must not exceed `TIMEOUT_CEILING_MS`. */
  timeoutMs?: number;
  /** Max delivery attempts before `dead` / exhausted. */
  maxAttempts?: number;
}

/**
 * Map of target operationId → config overrides.
 */
export type JobOperationConfigMap = Record<string, JobOperationConfig>;

/**
 * Options passed when starting the jobs service / creating its surfaces.
 */
export interface JobsServiceOptions {
  /**
   * Reviewed map of which operations may enqueue which operations.
   */
  triggerMap: TriggerMap;

  /**
   * Optional per-target overrides (timeout, maxAttempts).
   */
  operationConfig?: JobOperationConfigMap;

  /**
   * Bundled product OpenAPI document used to resolve operation_id → method/path
   * and to validate `background` tags / known ids at startup.
   */
  apiSpec: OpenApiDocument;

  /**
   * Unix socket path of the target app (M1 internal listener) for delivery.
   */
  targetSocketPath: string;

  /**
   * Key for an already-connected jobs DB. Prefer this when sharing a connection
   * (e.g. admin router + runtime in one process).
   */
  dbKey?: DbKey;

  /**
   * Options to connect the jobs DB when `dbKey` is not provided.
   */
  dbOptions?: DbOptions;
}

/**
 * Resolved OpenAPI operation used by delivery and enqueue validation.
 */
export interface ResolvedOperation {
  method: string;
  pathTemplate: string;
  isBackground: boolean;
}

/**
 * operation_id → resolved HTTP details from a bundled OpenAPI document.
 */
export type OperationMap = ReadonlyMap<string, ResolvedOperation>;
