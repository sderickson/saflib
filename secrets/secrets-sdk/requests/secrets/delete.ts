import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { client } from "../../client.ts";

export const useDeleteSecret = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return handleClientMethod(
        client.DELETE("/secrets/{id}", {
          params: { path: { id } },
        }),
      );
    },
    onSuccess: () => {
      // Invalidate and refetch secrets list
      queryClient.invalidateQueries({ queryKey: ["secrets", "list"] });
    },
  });
};
