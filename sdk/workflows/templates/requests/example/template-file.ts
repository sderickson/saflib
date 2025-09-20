import { useMutation, useQueryClient, queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { client } from "../../client.ts";
import type { ServiceNameServiceRequestBody } from "@template/file-spec";

// TODO: Delete whichever implementation is not being used; the file should either have a query or a mutation, but not both.

interface __ExtendedName__QueryOptions {
  // TODO: Define the interface for the query. Use vue Ref types, e.g.
  // offset: Ref<number>;
  // limit: Ref<number>;
}

export const __extendedName__Query = (
  // @ts-expect-error
  options: __ExtendedName__QueryOptions,
) => {
  return queryOptions({
    // TODO: as appropriate, define query key based on the options
    queryKey: ["__resource-name__", "__operation-name__"],
    queryFn: async () =>
      handleClientMethod(
        // @ts-expect-error TODO: define the interface for the query
        client.GET("/__resource-name__/__operation-name__", {
          // use options passed in
          params: {
            // limit: options.limit?.value,
          },
        }),
      ),
  });
};

export const use__ExtendedName__Mutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: ServiceNameServiceRequestBody["/__resource-name__/__operation-name__"],
    ) => {
      return handleClientMethod(
        // @ts-expect-error TODO: update to the actual route verb/name
        client.POST("/__resource-name__/__operation-name__", { body: data }),
      );
    },
    onSuccess: () => {
      // TODO: Update to invalidate
      queryClient.invalidateQueries({ queryKey: ["__resource-name__"] });
    },
  });
};
