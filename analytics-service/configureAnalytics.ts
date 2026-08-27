import type { AnalyticsService } from "./types.ts";

let analyticsClient: AnalyticsService | undefined;

/** Whether a process-level analytics client has been set. */
export function hasAnalyticsClient(): boolean {
  return analyticsClient !== undefined;
}

/**
 * Sets the process-level analytics client. Idempotent — subsequent calls are no-ops.
 * Vendor packages (e.g. `@saflib/vendors-posthog`) call this from their configure helpers.
 */
export function setAnalyticsClient(client: AnalyticsService): void {
  if (analyticsClient) return;
  analyticsClient = client;
}

/** Returns the client set by {@link setAnalyticsClient}. */
export function getAnalyticsClient(): AnalyticsService {
  if (!analyticsClient) {
    throw new Error(
      "Analytics client not initialized. Call setAnalyticsClient() (or a vendor configure helper) first.",
    );
  }
  return analyticsClient;
}

/** Test-only: clear the process-level client so configure / set can run again. */
export function resetAnalyticsForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetAnalyticsForTests is only available in test");
  }
  analyticsClient = undefined;
}
