import type { ResponseBody as getMineUserConfigsResponseBody } from "@saflib/base-spec/operations/getMineUserConfigs";
import { baseHandler } from "#typed-fake.ts";
import { ensureMockUserConfig } from "./mocks.ts";

export const getMineUserConfigsHandler = baseHandler({
  verb: "get",
  path: "/user-configs/mine",
  status: 200,
  handler: async (): Promise<
    getMineUserConfigsResponseBody["getMineUserConfigs"][200]
  > => {
    return { userConfig: ensureMockUserConfig() };
  },
});
