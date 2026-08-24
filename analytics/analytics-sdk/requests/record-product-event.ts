import type { AnalyticsRequestBody, paths } from "@saflib/analytics-spec";
import { createSafClient, handleClientMethod } from "@saflib/sdk";

export async function recordProductEvent(
  subdomain: string,
  body: AnalyticsRequestBody["recordProductEvent"],
): Promise<void> {
  const client = createSafClient<paths>(subdomain);
  await handleClientMethod(
    client.POST("/product-events/record", {
      body,
    }),
  );
}
