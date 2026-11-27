import { useQuery } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { computed, unref } from "vue";
import type { AuditResponseBody } from "@saflib/audit-spec/types";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export interface UseListAuditLogsOptions {
  from?: Ref<string | undefined>;
  cursor?: Ref<string | undefined>;
  limit?: Ref<number | undefined>;
  order?: Ref<"asc" | "desc" | undefined>;
  /** Only events where this user is the actor or the one acted for. */
  userId?: Ref<string | undefined>;
}

export function useListAuditLogs(options: UseListAuditLogsOptions = {}) {
  const client = getClient();
  return useQuery<AuditResponseBody["listAuditLogs"][200], TanstackError>({
    queryKey: computed(() => [
      "audit-logs",
      "list",
      unref(options.from),
      unref(options.cursor),
      unref(options.limit),
      unref(options.order),
      unref(options.userId),
    ]),
    queryFn: () => {
      const from = unref(options.from);
      const cursor = unref(options.cursor);
      const limit = unref(options.limit);
      const order = unref(options.order);
      const userId = unref(options.userId);
      return handleClientMethod(
        client.GET("/audit-logs", {
          params: {
            query: {
              ...(from !== undefined && from !== "" ? { from } : {}),
              ...(cursor !== undefined && cursor !== "" ? { cursor } : {}),
              ...(limit !== undefined ? { limit } : {}),
              ...(order !== undefined ? { order } : {}),
              ...(userId ? { user_id: userId } : {}),
            },
          },
        }),
      );
    },
  });
}
