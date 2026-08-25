import { useQuery } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { computed, unref } from "vue";
import type { AnalyticsResponseBody } from "@saflib/analytics-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export interface UseListProductEventsOptions {
  name?: Ref<string | undefined>;
  limit?: Ref<number | undefined>;
}

export function useListProductEvents(
  options: UseListProductEventsOptions = {},
) {
  const client = getClient();
  return useQuery<AnalyticsResponseBody["listProductEvents"][200], TanstackError>({
    queryKey: computed(() => [
      "product-events",
      "list",
      unref(options.name),
      unref(options.limit),
    ]),
    queryFn: () => {
      const name = unref(options.name);
      const limit = unref(options.limit);
      return handleClientMethod(
        client.GET("/admin/product-events", {
          params: {
            query: {
              ...(name !== undefined && name !== "" ? { name } : {}),
              ...(limit !== undefined ? { limit } : {}),
            },
          },
        }),
      );
    },
  });
}
