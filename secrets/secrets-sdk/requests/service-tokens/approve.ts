import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { client } from "../../client.ts";
import type { SecretsServiceRequestBody } from "@saflib/secrets-spec";

export const useApproveServiceToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: { id: string } & SecretsServiceRequestBody["approveServiceToken"],
    ) => {
      const { id, ...approveData } = data;
      return handleClientMethod(
        client.POST("/service-tokens/{id}/approve", {
          params: { path: { id } },
          body: approveData,
        }),
      );
    },
    onSuccess: () => {
      // Invalidate and refetch service tokens list
      queryClient.invalidateQueries({ queryKey: ["service-tokens", "list"] });
    },
  });
};
