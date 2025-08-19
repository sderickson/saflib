import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type { CronRequest, CronResponse } from "@saflib/cron-spec";
import { TanstackError, handleClientMethod } from "@saflib/vue-spa";
import type { paths } from "@saflib/cron-spec";
import { createSafClient } from "@saflib/vue-spa";

export function useListCronJobs(subdomain: string) {
  const client = createSafClient<paths>(subdomain);
  return useQuery<CronResponse["listCronJobs"][200], TanstackError>({
    queryKey: ["cron", "jobs"],
    queryFn: () => {
      return handleClientMethod(client.GET("/cron/jobs", {}));
    },
  });
}

export function useUpdateCronJobSettings(subdomain: string) {
  const client = createSafClient<paths>(subdomain);
  const queryClient = useQueryClient();
  return useMutation<
    CronResponse["updateCronJobSettings"][200],
    TanstackError,
    CronRequest["updateCronJobSettings"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.PUT("/cron/jobs/settings", { body }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cron", "jobs"] });
    },
  });
}
