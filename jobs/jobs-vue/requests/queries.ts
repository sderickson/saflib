import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  JobsServiceRequestBody,
  JobsServiceResponseBody,
  paths,
} from "@saflib/jobs-spec";
import { TanstackError, handleClientMethod, createSafClient } from "@saflib/sdk";

export type ListJobsQuery = NonNullable<
  paths["/jobs"]["get"]["parameters"]["query"]
>;

export function useListJobs(
  subdomain: string,
  filters: MaybeRefOrGetter<ListJobsQuery> = {},
) {
  const client = createSafClient<paths>(subdomain);
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

export function useGetJob(
  subdomain: string,
  id: MaybeRefOrGetter<string | null | undefined>,
) {
  const client = createSafClient<paths>(subdomain);
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

export function useRetryJob(subdomain: string) {
  const client = createSafClient<paths>(subdomain);
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

export function useCancelJob(subdomain: string) {
  const client = createSafClient<paths>(subdomain);
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

export function useCancelJobsByOriginalRequest(subdomain: string) {
  const client = createSafClient<paths>(subdomain);
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
