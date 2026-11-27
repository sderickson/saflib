import type { AnalyticsRequestBody } from "@saflib/analytics-spec";
import { recordProductEvent } from "@saflib/analytics-sdk/requests/record-product-event";
import {
  registerProductEventConnector,
  setProductEventsForwardedToServer,
  type ProductEventCommon,
} from "./events.ts";
import { isTestEnv } from "./wip-env.ts";

let registered = false;

/**
 * Send every product event to the product's API (`POST /product-events`),
 * which records it like a server-side event: logs DB, Prometheus count and
 * the analytics vendor. Called once by {@link createSpaMain}. Failures (rate
 * limits, offline) are dropped quietly; analytics must never break the page.
 */
export function registerServerProductEventConnector(): void {
  if (registered || isTestEnv()) return;
  registered = true;
  setProductEventsForwardedToServer(true);
  registerProductEventConnector(async (event: ProductEventCommon & { org?: unknown }) => {
    // Only the fields the API accepts; product event types may carry more.
    const body: AnalyticsRequestBody["recordProductEvent"]["product_event"] = { event: event.event };
    if (event.client) body.client = event.client;
    if (event.view) body.view = event.view;
    if (event.component) body.component = event.component;
    if (typeof event.org === "string") body.org = event.org;
    if (event.context) body.context = event.context;
    try {
      await recordProductEvent({ product_event: body });
    } catch (error) {
      if (import.meta.env.DEV) console.debug("Product event not recorded", event.event, error);
    }
  });
}
