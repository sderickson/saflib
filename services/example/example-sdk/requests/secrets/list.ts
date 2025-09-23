import { useMutation, useQueryClient, queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { client } from "../../client.ts";
import type { ExampleServiceRequestBody } from "example-spec";

// TODO: Delete whichever implementation is not being used; the file should either have a query or a mutation, but not both.

interface ListSecretsQueryOptions {
  // TODO: Define the interface for the query. Use vue Ref types, e.g.
  // offset: Ref<number>;
  // limit: Ref<number>;
}

export const listSecretsQuery = (
  // @ts-expect-error
  options: ListSecretsQueryOptions,
) => {
  return queryOptions({
    // TODO: as appropriate, define query key based on the options
    queryKey: ["secrets", "list"],
    queryFn: async () =>
      handleClientMethod(
        // @ts-expect-error TODO: define the interface for the query
        client.GET("/secrets/list", {
          // use options passed in
          params: {
            // limit: options.limit?.value,
          },
        }),
      ),
  });
};

export const useListSecretsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ExampleServiceRequestBody["/secrets/list"]) => {
      return handleClientMethod(
        // @ts-expect-error TODO: update to the actual route verb/name
        client.POST("/secrets/list", { body: data }),
      );
    },
    onSuccess: () => {
      // TODO: Update to invalidate
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
    },
  });
};
