import type { ErrorsRequestBody } from "@saflib/errors-spec";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export async function recordReportedError(
  body: ErrorsRequestBody["recordReportedError"],
): Promise<void> {
  const client = getClient();
  await handleClientMethod(
    client.POST("/errors/record", {
      body,
    }),
  );
}
