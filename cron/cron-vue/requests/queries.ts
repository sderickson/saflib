import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type { CronRequestBody, CronResponseBody } from "@saflib/cron-spec";
import { TanstackError, handleClientMethod } from "@saflib/vue";
import type { paths } from "@saflib/cron-spec";
import { createSafClient } from "@saflib/vue";

export function useListCronJobs(subdomain: string) {
  const client = createSafClient<paths>(subdomain);
  return useQuery<CronResponseBody["listCronJobs"][200], TanstackError>({
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
    CronResponseBody["updateCronJobSettings"][200],
    TanstackError,
    CronRequestBody["updateCronJobSettings"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.PUT("/cron/jobs/settings", { body }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cron", "jobs"] });
    },
  });
}
