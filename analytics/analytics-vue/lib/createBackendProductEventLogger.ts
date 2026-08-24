import {
  commonEventLogger,
  makeProductEventLogger,
  type ProductEventCommon,
} from "@saflib/vue";
import { recordProductEvent } from "@saflib/analytics-sdk";
import type { AnalyticsRequestBody } from "@saflib/analytics-spec";

export interface BackendProductEventLoggerOptions {
  /** API subdomain (typically `api`). */
  subdomain?: string;
}

/**
 * Product event logger that always POSTs to the backend ring buffer, then
 * optionally forwards to PostHog / gtag / test-mode cookie helpers.
 */
export function createBackendProductEventLogger<
  T extends ProductEventCommon,
>(options: BackendProductEventLoggerOptions = {}) {
  const subdomain = options.subdomain ?? "api";
  const baseLogger = makeProductEventLogger<T>();

  baseLogger.onProductEvent(async (event) => {
    try {
      await recordProductEvent(subdomain, {
        productEvent:
          event as AnalyticsRequestBody["recordProductEvent"]["productEvent"],
      });
    } catch (error) {
      console.error("Failed to record product event to backend", error);
    }
    commonEventLogger(event);
  });

  return baseLogger;
}
