import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "./client.js";
import type { CronRequest, CronResponse } from "@saflib/cron-spec";
import { TanstackError, handleClientMethod } from "@saflib/vue-spa";

export function useListCronJobs() {
  return useQuery<CronResponse["listCronJobs"][200], TanstackError>({
    queryKey: ["cron", "jobs"],
    queryFn: () => {
      return handleClientMethod(client.GET("/cron/jobs", {}));
    },
  });
}

export function useUpdateCronJobSettings() {
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
