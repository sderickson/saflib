import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  JobsServiceRequestBody,
  JobsServiceResponseBody,
  paths,
} from "@saflib/jobs-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export type ListJobsQuery = NonNullable<
  paths["/jobs"]["get"]["parameters"]["query"]
>;

export function useListJobs(filters: MaybeRefOrGetter<ListJobsQuery> = {}) {
  const client = getClient();
  const resolvedFilters = computed(() => toValue(filters));
  return useQuery<JobsServiceResponseBody["listJobs"][200], TanstackError>({
    queryKey: ["jobs", "list", resolvedFilters],
    queryFn: () => {
      return handleClientMethod(
        client.GET("/jobs", {
          params: { query: resolvedFilters.value },
        }),
      );
    },
  });
}

export function useGetJob(id: MaybeRefOrGetter<string | null | undefined>) {
  const client = getClient();
  const resolvedId = computed(() => toValue(id));
  return useQuery<JobsServiceResponseBody["getJob"][200], TanstackError>({
    queryKey: ["jobs", "get", resolvedId],
    enabled: computed(() => !!resolvedId.value),
    queryFn: () => {
      const jobId = resolvedId.value;
      if (!jobId) {
        throw new Error("Job id is required");
      }
      return handleClientMethod(
        client.GET("/jobs/{id}", {
          params: { path: { id: jobId } },
        }),
      );
    },
  });
}

export function useRetryJob() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<
    JobsServiceResponseBody["retryJob"][200],
    TanstackError,
    string
  >({
    mutationFn: (id) => {
      return handleClientMethod(
        client.POST("/jobs/{id}/retry", {
          params: { path: { id } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useCancelJob() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<
    JobsServiceResponseBody["cancelJob"][200],
    TanstackError,
    string
  >({
    mutationFn: (id) => {
      return handleClientMethod(
        client.POST("/jobs/{id}/cancel", {
          params: { path: { id } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useCancelJobsByOriginalRequest() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<
    JobsServiceResponseBody["cancelJobsByOriginalRequest"][200],
    TanstackError,
    JobsServiceRequestBody["cancelJobsByOriginalRequest"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(
        client.POST("/jobs/cancel-by-original-request", { body }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
