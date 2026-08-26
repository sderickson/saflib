import { queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";

export const GET_MINE_USER_CONFIGS_QUERY_KEY = [
  "user-configs",
  "get-mine",
] as const;

/** Load (or lazy-create) the signed-in user's UserConfig. */
export const getMineUserConfigsQuery = () => {
  return queryOptions({
    queryKey: GET_MINE_USER_CONFIGS_QUERY_KEY,
    queryFn: async () =>
      handleClientMethod(getClient().GET("/user-configs/mine")),
  });
};
