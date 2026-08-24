import { recordProductEvent } from "@saflib/analytics-sdk";
import type { AnalyticsRequestBody } from "@saflib/analytics-spec";
import {
  isDevEnv,
  registerProductEventConnector,
  type ProductEventCommon,
} from "@saflib/vue";

export interface DevBackendProductEventConnectorOptions {
  /** API subdomain (typically `api`). */
  subdomain?: string;
}

/**
 * In development, POST product events to the backend ring buffer so they appear
 * in {@link @saflib/analytics-vue/pages/AnalyticsEventsPage.vue}. Registers a
 * connector on {@link @saflib/vue}'s {@link commonEventLogger} — call once
 * before wiring `makeProductEventLogger` → `commonEventLogger`.
 */
export function registerDevBackendProductEventConnector(
  options: DevBackendProductEventConnectorOptions = {},
): void {
  if (!isDevEnv()) {
    return;
  }

  const subdomain = options.subdomain ?? "api";

  registerProductEventConnector(async (event: ProductEventCommon) => {
    try {
      await recordProductEvent(subdomain, {
        productEvent:
          event as AnalyticsRequestBody["recordProductEvent"]["productEvent"],
      });
    } catch (error) {
      console.error("Failed to record product event to backend", error);
    }
  });
}
