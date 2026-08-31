import { computed, inject, ref, type InjectionKey } from "vue";
import type { Job } from "@saflib/jobs-spec";
import { useListJobs, type ListJobsQuery } from "../requests/queries.ts";

export function useJobsLoader() {
  const pageSize = 20;
  const offset = ref(0);
  const statusFilter = ref<Job["status"] | null>(null);
  const operationIdFilter = ref("");
  const userIdFilter = ref("");
  const originalRequestIdFilter = ref("");

  const listFilters = computed<ListJobsQuery>(() => {
    const filters: ListJobsQuery = {
      limit: pageSize,
      offset: offset.value,
    };
    if (statusFilter.value) filters.status = statusFilter.value;
    if (operationIdFilter.value) filters.operation_id = operationIdFilter.value;
    if (userIdFilter.value) filters.user_id = userIdFilter.value;
    if (originalRequestIdFilter.value) {
      filters.original_request_id = originalRequestIdFilter.value;
    }
    return filters;
  });

  return {
    pageSize,
    offset,
    statusFilter,
    operationIdFilter,
    userIdFilter,
    originalRequestIdFilter,
    jobsQuery: useListJobs(listFilters),
  };
}

export type JobsLoader = ReturnType<typeof useJobsLoader>;

export const jobsLoaderKey: InjectionKey<JobsLoader> = Symbol("jobsLoader");

/** Shared loader bundle when provided by {@link JobsAsync.vue}. */
export function useJobsPageLoader(): JobsLoader {
  return inject(jobsLoaderKey, null) ?? useJobsLoader();
}
