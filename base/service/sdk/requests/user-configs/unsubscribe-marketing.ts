import type { RequestBody as unsubscribeMarketingEmailsUserConfigsRequestBody } from "@saflib/base-spec/operations/unsubscribeMarketingEmailsUserConfigs";
import { useMutation } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";

export function useUnsubscribeMarketingEmailsUserConfigsMutation() {
  return useMutation({
    mutationFn: (
      body: unsubscribeMarketingEmailsUserConfigsRequestBody["unsubscribeMarketingEmailsUserConfigs"],
    ) =>
      handleClientMethod(
        getClient().POST("/user-configs/unsubscribe-marketing", { body }),
      ),
  });
}
