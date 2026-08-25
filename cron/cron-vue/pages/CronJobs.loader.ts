import { inject, type InjectionKey } from "vue";
import {
  useListCronJobs,
  useUpdateCronJobSettings,
} from "../requests/queries.ts";

export function useCronJobsLoader() {
  return {
    jobsQuery: useListCronJobs(),
    updateMutation: useUpdateCronJobSettings(),
  };
}

export type CronJobsLoader = ReturnType<typeof useCronJobsLoader>;

export const cronJobsLoaderKey: InjectionKey<CronJobsLoader> =
  Symbol("cronJobsLoader");

/** Shared loader bundle when provided by {@link CronJobsAsync.vue}. */
export function useCronJobsPageLoader(): CronJobsLoader {
  return inject(cronJobsLoaderKey, null) ?? useCronJobsLoader();
}
