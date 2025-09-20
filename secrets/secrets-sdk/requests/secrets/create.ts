import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { client } from "../../client.ts";
import type { SecretsServiceRequestBody } from "@saflib/secrets-spec";

export const useCreateSecret = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SecretsServiceRequestBody["createSecret"]) => {
      return handleClientMethod(client.POST("/secrets", { body: data }));
    },
    onSuccess: () => {
      // Invalidate and refetch secrets list
      queryClient.invalidateQueries({ queryKey: ["secrets", "list"] });
    },
  });
};
