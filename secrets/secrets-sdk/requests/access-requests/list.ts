import { useQuery, queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";
import type { Ref } from "vue";

interface ListAccessRequestsQueryOptions {
  limit?: Ref<number>;
  offset?: Ref<number>;
  status?: Ref<"pending" | "granted" | "denied">;
  service_name?: Ref<string>;
}

export const listAccessRequestsQuery = (
  options: ListAccessRequestsQueryOptions,
) => {
  return queryOptions({
    queryKey: [
      "access-requests",
      "list",
      options.limit,
      options.offset,
      options.status,
      options.service_name,
    ],
    queryFn: async () =>
      handleClientMethod(
        getClient().GET("/access-requests", {
          params: {
            query: {
              limit: options.limit?.value,
              offset: options.offset?.value,
              status: options.status?.value,
              service_name: options.service_name?.value,
            },
          },
        }),
      ),
  });
};

export const useListAccessRequests = (
  options: ListAccessRequestsQueryOptions,
) => {
  return useQuery(listAccessRequestsQuery(options));
};
