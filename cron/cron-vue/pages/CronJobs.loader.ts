import { useListCronJobs } from "../requests/queries.ts";

export function useCronJobsLoader() {
  return {
    jobsQuery: useListCronJobs(),
  };
}
