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

    const wasOptedIn = config.marketingEmailsOptIn;
    config.displayName = data.displayName;
    config.marketingEmailsOptIn = data.marketingEmailsOptIn;
    if (data.marketingEmailsOptIn) {
      if (!wasOptedIn) {
        config.marketingEmailsOptInAt = now;
      }
    } else {
      config.marketingEmailsOptInAt = null;
    }
    if (
      data.termsOfServiceAgreedAt === "now" &&
      !config.termsOfServiceAgreedAt
    ) {
      config.termsOfServiceAgreedAt = now;
    }
    config.updatedAt = now;

    return { userConfig: { ...config } };
  },
});
