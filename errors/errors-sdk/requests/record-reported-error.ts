import type { ErrorsRequestBody, paths } from "@saflib/errors-spec";
import { createSafClient, handleClientMethod } from "@saflib/sdk";

export async function recordReportedError(
  subdomain: string,
  body: ErrorsRequestBody["recordReportedError"],
): Promise<void> {
  const client = createSafClient<paths>(subdomain);
  await handleClientMethod(
    client.POST("/errors/record", {
      body,
    }),
  );
}
