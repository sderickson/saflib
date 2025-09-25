import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";
import type { SecretsServiceRequestBody } from "@saflib/secrets-spec";

export const useApproveAccessRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: { id: string } & SecretsServiceRequestBody["approveAccessRequest"],
    ) => {
      const { id, ...approveData } = data;
      return handleClientMethod(
        getClient().POST("/access-requests/{id}/approve", {
          params: { path: { id } },
          body: approveData,
        }),
      );
    },
    onSuccess: () => {
      // Invalidate and refetch access requests list
      queryClient.invalidateQueries({ queryKey: ["access-requests", "list"] });
    },
  });
};
