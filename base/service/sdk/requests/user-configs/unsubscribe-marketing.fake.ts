import type { ResponseBody as unsubscribeMarketingEmailsUserConfigsResponseBody } from "@saflib/base-spec/operations/unsubscribeMarketingEmailsUserConfigs";
import { baseHandler } from "../../typed-fake.ts";

export const unsubscribeMarketingEmailsUserConfigsHandler = baseHandler({
  verb: "post",
  path: "/user-configs/unsubscribe-marketing",
  status: 200,
  handler: async (): Promise<
    unsubscribeMarketingEmailsUserConfigsResponseBody["unsubscribeMarketingEmailsUserConfigs"][200]
  > => {
    return {};
  },
});
