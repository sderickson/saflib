import type { JobTerminalReason } from "@saflib/jobs-db";
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
      status_code: number;
      metricStatus: "succeeded";
    }
  | {
      kind: "retry";
      status_code?: number;
      error_body?: string;
      /** Prefer this delay when set (e.g. from Retry-After). */
      retryAfterMs?: number;
      metricStatus: Extract<
        JobsDeliveryMetricStatus,
        "retryable-failure" | "timeout"
      >;
    }
  | {
      kind: "dead";
      status_code?: number;
      error_body?: string;
      terminal_reason: AttemptDeadTerminalReason;
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

function isAuthUnresolvable(status_code: number, error_body: string | undefined): boolean {
  if (status_code !== 401 || error_body == null) {
    return false;
  }
  try {
    const parsed = JSON.parse(error_body) as { code?: unknown };
    return parsed.code === "auth_unresolvable";
  } catch {
    return error_body.includes("auth_unresolvable");
  }
}

export interface ClassifyDeliveryInput {
  /** Set when the attempt aborted due to the operation timeout. */
  timedOut?: boolean;
  /** Set when fetch failed with a network/transport error (not HTTP). */
  networkError?: boolean;
  response?: Response;
  /** Pre-read body; when omitted and response is present, body is read. */
  error_body?: string;
  /** Current 1-based attempt number after claim. */
  attempt: number;
  max_attempts: number;
  now?: Date;
}

/**
 * Classify a delivery attempt per the jobs retry/completion semantics.
 */
export async function classifyDelivery(
  input: ClassifyDeliveryInput,
): Promise<DeliveryClassification> {
  const now = input.now ?? new Date();
  const attemptsRemain = input.attempt < input.max_attempts;

  const finishRetry = (
    partial: Omit<Extract<DeliveryClassification, { kind: "retry" }>, "kind">,
  ): DeliveryClassification => {
    if (!attemptsRemain) {
      return {
        kind: "dead",
        status_code: partial.status_code,
        error_body: partial.error_body,
        terminal_reason: "exhausted",
        metricStatus: partial.metricStatus === "timeout" ? "timeout" : "dead",
      };
    }
    return { kind: "retry", ...partial };
  };

  if (input.timedOut) {
    return finishRetry({
      metricStatus: "timeout",
      error_body: input.error_body ?? "delivery timed out",
    });
  }

  if (input.networkError || !input.response) {
    return finishRetry({
      metricStatus: "retryable-failure",
      error_body: input.error_body ?? "network error",
    });
  }

  const response = input.response;
  const status_code = response.status;
  const error_body =
    status_code >= 200 && status_code < 300
      ? undefined
      : capErrorBody(input.error_body ?? (await readErrorBody(response)));

  const retryHeader = response.headers.get("x-jobs-retry")?.toLowerCase();

  if (retryHeader === "never") {
    if (status_code >= 200 && status_code < 300) {
      return { kind: "succeeded", status_code, metricStatus: "succeeded" };
    }
    return {
      kind: "dead",
      status_code,
      error_body,
      terminal_reason: "rejected-by-endpoint",
      metricStatus: "dead",
    };
  }

  if (retryHeader === "always") {
    return finishRetry({
      status_code,
      error_body,
      metricStatus: "retryable-failure",
      retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after"), now),
    });
  }

  if (status_code >= 200 && status_code < 300) {
    return { kind: "succeeded", status_code, metricStatus: "succeeded" };
  }

  if (isAuthUnresolvable(status_code, error_body)) {
    return {
      kind: "dead",
      status_code,
      error_body,
      terminal_reason: "auth-unresolvable",
      metricStatus: "dead",
    };
  }

  if (status_code === 429) {
    return finishRetry({
      status_code,
      error_body,
      metricStatus: "retryable-failure",
      retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after"), now),
    });
  }

  if (status_code >= 500) {
    return finishRetry({
      status_code,
      error_body,
      metricStatus: "retryable-failure",
    });
  }

  if (status_code >= 400) {
    return {
      kind: "dead",
      status_code,
      error_body,
      terminal_reason: "permanent-status",
      metricStatus: "dead",
    };
  }

  // Unexpected 1xx/3xx — treat as retryable.
  return finishRetry({
    status_code,
    error_body,
    metricStatus: "retryable-failure",
  });
}
