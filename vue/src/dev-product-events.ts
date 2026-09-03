import type { AnalyticsRequestBody } from "@saflib/analytics-spec";
import { recordProductEvent } from "@saflib/analytics-sdk/requests/record-product-event";
import {
  isDevEnv,
  registerProductEventConnector,
  type ProductEventCommon,
} from "./events.ts";

/**
 * In development, POST product events to the backend ring buffer so they appear
 * in the admin Product Events page. Registers a connector on
 * {@link commonEventLogger} — called from {@link createSpaMain} in dev only.
 */
export function registerDevBackendProductEventConnector(): void {
  if (!isDevEnv()) {
    return;
  }

  registerProductEventConnector(async (event: ProductEventCommon) => {
    try {
      await recordProductEvent({
        product_event:
          event as AnalyticsRequestBody["recordProductEvent"]["product_event"],
      });
    } catch (error) {
      console.error("Failed to record product event to backend", error);
    }
  });
}
