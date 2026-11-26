import type { ErrorsRequestBody } from "@saflib/errors-spec";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

/** Report a browser error as a signed-in user (`POST /errors/report`). */
export async function reportClientError(
  body: ErrorsRequestBody["reportClientError"],
): Promise<void> {
  const client = getClient();
  await handleClientMethod(client.POST("/errors/report", { body }));
}
