import { useQuery } from "@tanstack/vue-query";
import type { MetricsResponseBody } from "@saflib/node-metrics-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export function useGetMetricsSnapshot() {
  const client = getClient();
  return useQuery<MetricsResponseBody["getMetricsSnapshot"][200], TanstackError>({
    queryKey: ["metrics", "snapshot"],
    queryFn: () =>
      handleClientMethod(client.GET("/admin/metrics/snapshot", {})),
  });
}
