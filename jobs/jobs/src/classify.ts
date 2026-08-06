import type { JobTerminalReason } from "jobs-db";
import {
  BACKOFF_BASE_MS,
  BACKOFF_FACTOR,
  BACKOFF_MAX_MS,
  ERROR_BODY_CAP_BYTES,
} from "./constants.ts";
import type { JobsDeliveryMetricStatus } from "./metrics.ts";

type AttemptDeadTerminalReason = Extract<
  JobTerminalReason,
  | "exhausted"
  | "permanent-status"
  | "rejected-by-endpoint"
  | "auth-unresolvable"
>;

export type DeliveryClassification =
  | {
      kind: "succeeded";
      statusCode: number;
      metricStatus: "succeeded";
    }
  | {
      kind: "retry";
      statusCode?: number;
      errorBody?: string;
      /** Prefer this delay when set (e.g. from Retry-After). */
      retryAfterMs?: number;
      metricStatus: Extract<
        JobsDeliveryMetricStatus,
        "retryable-failure" | "timeout"
      >;
    }
  | {
      kind: "dead";
      statusCode?: number;
      errorBody?: string;
      terminalReason: AttemptDeadTerminalReason;
      metricStatus: Extract<JobsDeliveryMetricStatus, "dead" | "timeout">;
    };

export function capErrorBody(body: string | undefined): string | undefined {
  if (body == null) {
    return undefined;
  }
  if (Buffer.byteLength(body, "utf8") <= ERROR_BODY_CAP_BYTES) {
    return body;
  }
  // Truncate by UTF-8 bytes without splitting mid-codepoint.
  const buf = Buffer.from(body, "utf8").subarray(0, ERROR_BODY_CAP_BYTES);
  return buf.toString("utf8");
}

/**
 * Exponential backoff with jitter: min(max, base * factor^(attempt-1)) * U(0.5, 1].
 * `attempt` is the 1-based attempt that just failed.
 */
export function computeBackoffMs(
  attempt: number,
  random: () => number = Math.random,
): number {
  const exp = BACKOFF_BASE_MS * Math.pow(BACKOFF_FACTOR, Math.max(0, attempt - 1));
  const capped = Math.min(BACKOFF_MAX_MS, exp);
  return Math.floor(capped * (0.5 + random() * 0.5));
}

/**
 * Parse Retry-After as delay-seconds or HTTP-date. Returns ms from `now`, or
 * undefined if missing/invalid.
 */
export function parseRetryAfterMs(
  header: string | null,
  now: Date = new Date(),
): number | undefined {
  if (header == null || header.trim() === "") {
    return undefined;
  }
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) {
    return undefined;
  }
  return Math.max(0, date - now.getTime());
}

async function readErrorBody(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text();
    return text === "" ? undefined : text;
  } catch {
    return undefined;
  }
}

function isAuthUnresolvable(statusCode: number, errorBody: string | undefined): boolean {
  if (statusCode !== 401 || errorBody == null) {
    return false;
  }
  try {
    const parsed = JSON.parse(errorBody) as { code?: unknown };
    return parsed.code === "auth_unresolvable";
  } catch {
    return errorBody.includes("auth_unresolvable");
  }
}

export interface ClassifyDeliveryInput {
  /** Set when the attempt aborted due to the operation timeout. */
  timedOut?: boolean;
  /** Set when fetch failed with a network/transport error (not HTTP). */
  networkError?: boolean;
  response?: Response;
  /** Pre-read body; when omitted and response is present, body is read. */
  errorBody?: string;
  /** Current 1-based attempt number after claim. */
  attempt: number;
  maxAttempts: number;
  now?: Date;
}

/**
 * Classify a delivery attempt per the jobs retry/completion semantics.
 */
export async function classifyDelivery(
  input: ClassifyDeliveryInput,
): Promise<DeliveryClassification> {
  const now = input.now ?? new Date();
  const attemptsRemain = input.attempt < input.maxAttempts;

  const finishRetry = (
    partial: Omit<Extract<DeliveryClassification, { kind: "retry" }>, "kind">,
  ): DeliveryClassification => {
    if (!attemptsRemain) {
      return {
        kind: "dead",
        statusCode: partial.statusCode,
        errorBody: partial.errorBody,
        terminalReason: "exhausted",
        metricStatus: partial.metricStatus === "timeout" ? "timeout" : "dead",
      };
    }
    return { kind: "retry", ...partial };
  };

  if (input.timedOut) {
    return finishRetry({
      metricStatus: "timeout",
      errorBody: input.errorBody ?? "delivery timed out",
    });
  }

  if (input.networkError || !input.response) {
    return finishRetry({
      metricStatus: "retryable-failure",
      errorBody: input.errorBody ?? "network error",
    });
  }

  const response = input.response;
  const statusCode = response.status;
  const errorBody =
    statusCode >= 200 && statusCode < 300
      ? undefined
      : capErrorBody(input.errorBody ?? (await readErrorBody(response)));

  const retryHeader = response.headers.get("x-jobs-retry")?.toLowerCase();

  if (retryHeader === "never") {
    return {
      kind: "dead",
      statusCode,
      errorBody,
      terminalReason: "rejected-by-endpoint",
      metricStatus: "dead",
    };
  }

  if (retryHeader === "always") {
    return finishRetry({
      statusCode,
      errorBody,
      metricStatus: "retryable-failure",
      retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after"), now),
    });
  }

  if (statusCode >= 200 && statusCode < 300) {
    return { kind: "succeeded", statusCode, metricStatus: "succeeded" };
  }

  if (isAuthUnresolvable(statusCode, errorBody)) {
    return {
      kind: "dead",
      statusCode,
      errorBody,
      terminalReason: "auth-unresolvable",
      metricStatus: "dead",
    };
  }

  if (statusCode === 429) {
    return finishRetry({
      statusCode,
      errorBody,
      metricStatus: "retryable-failure",
      retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after"), now),
    });
  }

  if (statusCode >= 500) {
    return finishRetry({
      statusCode,
      errorBody,
      metricStatus: "retryable-failure",
    });
  }

  if (statusCode >= 400) {
    return {
      kind: "dead",
      statusCode,
      errorBody,
      terminalReason: "permanent-status",
      metricStatus: "dead",
    };
  }

  // Unexpected 1xx/3xx — treat as retryable.
  return finishRetry({
    statusCode,
    errorBody,
    metricStatus: "retryable-failure",
  });
}
