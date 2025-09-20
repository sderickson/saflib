import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { client } from "../../client.ts";
import type { SecretsServiceRequestBody } from "@saflib/secrets-spec";

export const useUpdateSecret = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: { id: string } & SecretsServiceRequestBody["updateSecret"],
    ) => {
      const { id, ...updateData } = data;
      return handleClientMethod(
        client.PUT("/secrets/{id}", {
          params: { path: { id } },
          body: updateData,
        }),
      );
    },
    onSuccess: () => {
      // Invalidate and refetch secrets list
      queryClient.invalidateQueries({ queryKey: ["secrets", "list"] });
    },
  });
};
