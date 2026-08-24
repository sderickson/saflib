import { useQuery } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { computed, unref } from "vue";
import type { DevLogResponseBody } from "@saflib/node-log-spec";
import type { paths } from "@saflib/node-log-spec";
import { TanstackError, createSafClient, handleClientMethod } from "@saflib/sdk";

export interface UseListDevLogsOptions {
  after?: Ref<number | undefined>;
  limit?: Ref<number | undefined>;
}

export function useListDevLogs(
  subdomain: string,
  options: UseListDevLogsOptions = {},
) {
  const client = createSafClient<paths>(subdomain);
  return useQuery<DevLogResponseBody["listDevLogs"][200], TanstackError>({
    queryKey: computed(() => [
      "dev-logs",
      "list",
      unref(options.after),
      unref(options.limit),
    ]),
    queryFn: () => {
      const after = unref(options.after);
      const limit = unref(options.limit);
      return handleClientMethod(
        client.GET("/dev/logs", {
          params: {
            query: {
              ...(after !== undefined ? { after } : {}),
              ...(limit !== undefined ? { limit } : {}),
            },
          },
        }),
      );
    },
  });
}
