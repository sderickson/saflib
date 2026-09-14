import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import createClient from "openapi-fetch";
import type {
  paths,
  NewWorkflowsResponseBody,
  NewWorkflowsRequestBody,
} from "@saflib/new-workflows-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";

/** Same-origin — the workflows API is mounted into dev-site-http itself. */
function createWorkflowsClient() {
  return createClient<paths>({
    baseUrl: "",
    credentials: "include",
    fetch: (request) => {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("_csrf_token="))
        ?.split("=")[1];
      if (csrfToken) {
        request.headers.set("X-CSRF-Token", csrfToken);
      }
      const method = request.method.toUpperCase();
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        request.headers.set("X-Requested-With", "XMLHttpRequest");
      }
      return fetch(request);
    },
  });
}

export function useWorkflowsQuery() {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["listWorkflows"][200], TanstackError>({
    queryKey: ["new-workflows", "workflows"],
    queryFn: () => handleClientMethod(client.GET("/api/workflows", {})),
  });
}

export function useCreateWorkflowRunMutation() {
  const client = createWorkflowsClient();
  const queryClient = useQueryClient();
  return useMutation<
    NewWorkflowsResponseBody["createWorkflowRun"][201],
    TanstackError,
    { id: string; body: NewWorkflowsRequestBody["createWorkflowRun"] }
  >({
    mutationFn: ({ id, body }) =>
      handleClientMethod(
        client.POST("/api/workflows/{id}/runs", { params: { path: { id } }, body }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run"] });
    },
  });
}

export function useWorkflowRunQuery(runId: MaybeRefOrGetter<string | undefined>) {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["getWorkflowRun"][200], TanstackError>({
    queryKey: ["new-workflows", "run", runId],
    enabled: () => Boolean(toValue(runId)),
    queryFn: () =>
      handleClientMethod(
        client.GET("/api/runs/{runId}", { params: { path: { runId: toValue(runId)! } } }),
      ),
  });
}

export function useWorkflowRunLogsQuery(runId: MaybeRefOrGetter<string | undefined>) {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["listWorkflowRunLogs"][200], TanstackError>({
    queryKey: ["new-workflows", "run-logs", runId],
    enabled: () => Boolean(toValue(runId)),
    queryFn: () =>
      handleClientMethod(
        client.GET("/api/runs/{runId}/logs", { params: { path: { runId: toValue(runId)! } } }),
      ),
  });
}

export function useAdvanceWorkflowRunMutation() {
  const client = createWorkflowsClient();
  const queryClient = useQueryClient();
  return useMutation<NewWorkflowsResponseBody["advanceWorkflowRun"][200], TanstackError, string>({
    mutationFn: (runId) =>
      handleClientMethod(
        client.POST("/api/runs/{runId}/advance", { params: { path: { runId } } }),
      ),
    onSuccess: (_data, runId) => {
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run", runId] });
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run-logs", runId] });
    },
  });
}
