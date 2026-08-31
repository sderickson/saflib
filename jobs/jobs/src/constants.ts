/** Claim-loop backstop poll interval (wake-on-enqueue is the fast path). */
export const CLAIM_POLL_INTERVAL_MS = 500;

/** Max concurrent in-flight deliveries in one runtime process. */
export const GLOBAL_CONCURRENCY = 8;

/** Exponential backoff base delay. */
export const BACKOFF_BASE_MS = 5_000;

/** Multiplier applied per attempt: base * factor^attempt. */
export const BACKOFF_FACTOR = 4;

/** Cap on scheduled backoff delay (5 minutes). */
export const BACKOFF_MAX_MS = 5 * 60 * 1000;

/** Default max delivery attempts before a job goes `dead` / exhausted. */
export const DEFAULT_MAX_ATTEMPTS = 5;

/** Max serialized `request` JSON size (16 KB). */
export const REQUEST_SIZE_CAP_BYTES = 16 * 1024;

/** Max stored `result.errorBody` size (8 KB). */
export const ERROR_BODY_CAP_BYTES = 8 * 1024;

/** Default per-attempt delivery timeout (30s). */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Ceiling for per-operation `timeoutMs` overrides (120s). */
export const TIMEOUT_CEILING_MS = 120_000;

/** How long terminal jobs are retained before deletion (30 days). */
export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Extra time beyond the operation timeout before a stale `heartbeat_at` is
 * treated as a stalled delivery (timeout + grace).
 */
export const STALL_GRACE_MS = 30_000;

/** Interval for refreshing `heartbeat_at` while a delivery is in flight. */
export const HEARTBEAT_INTERVAL_MS = 5_000;

/** How often the runtime runs stall recovery (also runs once at startup). */
export const STALL_RECOVERY_INTERVAL_MS = 30_000;

/** How often the runtime deletes terminal jobs older than retention. */
export const RETENTION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

/** Max jobs allowed per `original_request_id` (spawn cap). */
export const SPAWN_CAP = 1_000;

/** OpenAPI tag that marks an operation as invocable by the job queue. */
export { OPENAPI_TAG_BACKGROUND as BACKGROUND_TAG } from "@saflib/openapi";

/**
 * Prefix for trigger-map keys that represent cron schedules rather than
 * OpenAPI operationIds (`cron:{jobName}`).
 */
export const CRON_TRIGGER_PREFIX = "cron:";
