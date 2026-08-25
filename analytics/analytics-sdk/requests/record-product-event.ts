import type { AnalyticsRequestBody } from "@saflib/analytics-spec";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export async function recordProductEvent(
  body: AnalyticsRequestBody["recordProductEvent"],
): Promise<void> {
  const client = getClient();
  await handleClientMethod(
    client.POST("/product-events/record", {
      body,
    }),
  );
}
