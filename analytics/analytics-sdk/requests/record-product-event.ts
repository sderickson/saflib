import type { AnalyticsRequestBody } from "@saflib/analytics-spec";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export async function recordProductEvent(
  body: AnalyticsRequestBody["recordProductEvent"],
): Promise<void> {
  // Dev-only ring buffer ingest; production analytics is up to the product owner.
  if (!import.meta.env.DEV) {
    return;
  }

  const client = getClient();
  await handleClientMethod(
    client.POST("/product-events/record", {
      body,
    }),
  );
}
