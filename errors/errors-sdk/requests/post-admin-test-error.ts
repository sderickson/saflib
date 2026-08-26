import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export async function postAdminTestError(): Promise<void> {
  const client = getClient();
  await handleClientMethod(client.POST("/admin/test-error", {}));
}
