import { useMutation, useQueryClient, queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { client } from "../../client.ts";
import type { __ServiceName__ServiceRequestBody } from "template-package-spec";

// TODO: Delete whichever implementation is not being used; the file should either have a query or a mutation, but not both.

interface __TargetName____GroupName__QueryOptions {
  // TODO: Define the interface for the query. Use vue Ref types, e.g.
  // offset: Ref<number>;
  // limit: Ref<number>;
}

export const __targetName____GroupName__Query = (
  // @ts-expect-error
  options: __TargetName____GroupName__QueryOptions,
) => {
  return queryOptions({
    // TODO: as appropriate, define query key based on the options
    queryKey: ["__group-name__", "__target-name__"],
    queryFn: async () =>
      handleClientMethod(
        // @ts-expect-error TODO: define the interface for the query
        client.GET("/__group-name__/__target-name__", {
          // use options passed in
          params: {
            // limit: options.limit?.value,
          },
        }),
      ),
  });
};

export const use__TargetName____GroupName__Mutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: __ServiceName__ServiceRequestBody["/__group-name__/__target-name__"],
    ) => {
      return handleClientMethod(
        // @ts-expect-error TODO: update to the actual route verb/name
        client.POST("/__group-name__/__target-name__", { body: data }),
      );
    },
    onSuccess: () => {
      // TODO: Update to invalidate
      queryClient.invalidateQueries({ queryKey: ["__group-name__"] });
    },
  });
};
