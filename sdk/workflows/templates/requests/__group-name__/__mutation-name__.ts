import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";
import type { __ServiceName__ServiceRequestBody } from "template-package-spec";

export const use__MutationName____GroupName__Mutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: __ServiceName__ServiceRequestBody["__mutationName____GroupName__"],
    ) => {
      return handleClientMethod(
        // @ts-expect-error TODO: update to correct HTTP method and path
        getClient().POST("/__group-name__/__mutation-name__", { body: data }),
      );
    },
    onSuccess: () => {
      // TODO: Update to invalidate the correct query key
      queryClient.invalidateQueries({ queryKey: ["__group-name__"] });
    },
  });
};
