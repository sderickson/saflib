import { useQuery, queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";
import type { Ref } from "vue";

interface ListSecretsQueryOptions {
  limit?: Ref<number>;
  offset?: Ref<number>;
  is_active?: Ref<boolean>;
}

export const listSecretsQuery = (options: ListSecretsQueryOptions) => {
  return queryOptions({
    queryKey: [
      "secrets",
      "list",
      options.limit,
      options.offset,
      options.is_active,
    ],
    queryFn: async () => {
      return handleClientMethod(
        getClient().GET("/secrets", {
          params: {
            query: {
              limit: options.limit?.value,
              offset: options.offset?.value,
              is_active: options.is_active?.value,
            },
          },
        }),
      );
    },
  });
};

export const useListSecrets = (options: ListSecretsQueryOptions) => {
  return useQuery(listSecretsQuery(options));
};
