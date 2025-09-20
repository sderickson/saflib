import { useQuery, queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { client } from "../../client.ts";
import type { Ref } from "vue";

interface ListServiceTokensQueryOptions {
  limit?: Ref<number>;
  offset?: Ref<number>;
  approved?: Ref<boolean>;
  service_name?: Ref<string>;
}

export const listServiceTokensQuery = (
  options: ListServiceTokensQueryOptions,
) => {
  return queryOptions({
    queryKey: [
      "service-tokens",
      "list",
      options.limit,
      options.offset,
      options.approved,
      options.service_name,
    ],
    queryFn: async () => {
      return handleClientMethod(
        client.GET("/service-tokens", {
          params: {
            query: {
              limit: options.limit?.value,
              offset: options.offset?.value,
              approved: options.approved?.value,
              service_name: options.service_name?.value,
            },
          },
        }),
      );
    },
  });
};

export const useListServiceTokens = (
  options: ListServiceTokensQueryOptions,
) => {
  return useQuery(listServiceTokensQuery(options));
};
