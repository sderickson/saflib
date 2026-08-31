import type {
  RequestBody as putMineUserConfigsRequestBody,
  ResponseBody as putMineUserConfigsResponseBody,
} from "@saflib/base-spec/operations/putMineUserConfigs";
import { baseHandler } from "#typed-fake.ts";
import { ensureMockUserConfig, MOCK_SESSION_USER_ID } from "./mocks.ts";

export const putMineUserConfigsHandler = baseHandler({
  verb: "put",
  path: "/user-configs/mine",
  status: 200,
  handler: async ({
    body,
  }): Promise<putMineUserConfigsResponseBody["putMineUserConfigs"][200]> => {
    const data = body as putMineUserConfigsRequestBody["putMineUserConfigs"];
    const config = ensureMockUserConfig(MOCK_SESSION_USER_ID);
    const now = new Date().toISOString();

    const wasOptedIn = config.marketing_emails_opt_in;
    config.display_name = data.display_name;
    config.marketing_emails_opt_in = data.marketing_emails_opt_in;
    if (data.marketing_emails_opt_in) {
      if (!wasOptedIn) {
        config.marketing_emails_opt_in_at = now;
      }
    } else {
      config.marketing_emails_opt_in_at = null;
    }
    if (
      data.terms_of_service_agreed_at === "now" &&
      !config.terms_of_service_agreed_at
    ) {
      config.terms_of_service_agreed_at = now;
    }
    config.updated_at = now;

    return { user_config: { ...config } };
  },
});
