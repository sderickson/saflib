import { useQuery } from "@tanstack/vue-query";
import type { MetricsResponseBody } from "@saflib/node-metrics-spec";
import type { paths } from "@saflib/node-metrics-spec";
import { TanstackError, createSafClient, handleClientMethod } from "@saflib/sdk";

export function useGetMetricsSnapshot(subdomain: string) {
  const client = createSafClient<paths>(subdomain);
  return useQuery<MetricsResponseBody["getMetricsSnapshot"][200], TanstackError>({
    queryKey: ["metrics", "snapshot"],
    queryFn: () =>
      handleClientMethod(client.GET("/admin/metrics/snapshot", {})),
  });
}
