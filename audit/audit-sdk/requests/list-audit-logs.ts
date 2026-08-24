import { useQuery } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { computed, unref } from "vue";
import type { AuditResponseBody, paths } from "@saflib/audit-spec";
import { TanstackError, createSafClient, handleClientMethod } from "@saflib/sdk";

export interface UseListAuditLogsOptions {
  from?: Ref<string | undefined>;
  cursor?: Ref<string | undefined>;
  limit?: Ref<number | undefined>;
  order?: Ref<"asc" | "desc" | undefined>;
}

export function useListAuditLogs(
  subdomain: string,
  options: UseListAuditLogsOptions = {},
) {
  const client = createSafClient<paths>(subdomain);
  return useQuery<AuditResponseBody["listAuditLogs"][200], TanstackError>({
    queryKey: computed(() => [
      "audit-logs",
      "list",
      unref(options.from),
      unref(options.cursor),
      unref(options.limit),
      unref(options.order),
    ]),
    queryFn: () => {
      const from = unref(options.from);
      const cursor = unref(options.cursor);
      const limit = unref(options.limit);
      const order = unref(options.order);
      return handleClientMethod(
        client.GET("/audit-logs", {
          params: {
            query: {
              ...(from !== undefined && from !== "" ? { from } : {}),
              ...(cursor !== undefined && cursor !== "" ? { cursor } : {}),
              ...(limit !== undefined ? { limit } : {}),
              ...(order !== undefined ? { order } : {}),
            },
          },
        }),
      );
    },
  });
}
