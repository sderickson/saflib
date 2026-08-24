import type { paths } from "@saflib/errors-spec";
import { createSafClient, handleClientMethod } from "@saflib/sdk";

export async function postAdminTestError(subdomain: string): Promise<void> {
  const client = createSafClient<paths>(subdomain);
  await handleClientMethod(client.POST("/admin/test-error", {}));
}
