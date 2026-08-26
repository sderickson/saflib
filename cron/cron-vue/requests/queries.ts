import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type { CronRequestBody, CronResponseBody } from "@saflib/cron-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export function useListCronJobs() {
  const client = getClient();
  return useQuery<CronResponseBody["listCronJobs"][200], TanstackError>({
    queryKey: ["cron", "jobs"],
    queryFn: () => {
      return handleClientMethod(client.GET("/cron/jobs", {}));
    },
  });
}

export function useUpdateCronJobSettings() {
  const client = getClient();
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
