import { computed, inject, ref, type InjectionKey } from "vue";
import { useRoute } from "vue-router";
import type { Job } from "@saflib/jobs-spec";
import { useListJobs, type ListJobsQuery } from "../requests/queries.ts";

const STATUSES: Job["status"][] = ["pending", "running", "retrying", "succeeded", "dead", "cancelled"];

export function useJobsLoader() {
  const pageSize = 20;
  const offset = ref(0);
  // Links can open the page filtered: /jobs?status=dead (the Overview),
  // ?request=<original request id> (a request's jobs), ?user=<id>.
  const query = useRoute()?.query ?? {};
  const initialStatus = query.status;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const statusFilter = ref<Job["status"] | null>(
    typeof initialStatus === "string" && STATUSES.includes(initialStatus as Job["status"])
      ? (initialStatus as Job["status"])
      : null,
  );
  const operationIdFilter = ref("");
  const userIdFilter = ref(str(query.user));
  const originalRequestIdFilter = ref(str(query.request));

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
