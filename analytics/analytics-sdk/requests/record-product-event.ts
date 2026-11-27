import type { AnalyticsRequestBody } from "@saflib/analytics-spec";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

/** Send a browser product event to the product's API (`POST /product-events`). */
export async function recordProductEvent(body: AnalyticsRequestBody["recordProductEvent"]): Promise<void> {
  await handleClientMethod(getClient().POST("/product-events", { body }));
}
