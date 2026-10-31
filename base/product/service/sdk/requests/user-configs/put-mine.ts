import type { RequestBody as putMineUserConfigsRequestBody } from "@saflib/base-spec/operations/putMineUserConfigs";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "#client.ts";
import { GET_MINE_USER_CONFIGS_QUERY_KEY } from "./get-mine.ts";

export type PutMineUserConfigsVariables =
  putMineUserConfigsRequestBody["putMineUserConfigs"];

/** Update the signed-in user's display name and marketing email preference. */
export function usePutMineUserConfigsMutation() {
  const queryClient = useQueryClient();

  const mutationFn = (body: PutMineUserConfigsVariables) => {
    return handleClientMethod(getClient().PUT("/user-configs/mine", { body }));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: GET_MINE_USER_CONFIGS_QUERY_KEY,
      });
    },
  });
}
