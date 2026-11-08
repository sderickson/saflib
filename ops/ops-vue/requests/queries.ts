import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { OpsRequestBody, OpsResponseBody } from "@saflib/ops-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

const opsTokensKey = ["ops", "tokens"] as const;

export function useListOpsTokens() {
  const client = getClient();
  return useQuery<OpsResponseBody["listOpsTokens"][200], TanstackError>({
    queryKey: opsTokensKey,
    queryFn: () => handleClientMethod(client.GET("/admin/ops-tokens", {})),
  });
}

export function useCreateOpsToken() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<
    OpsResponseBody["createOpsToken"][201],
    TanstackError,
    OpsRequestBody["createOpsToken"]
  >({
    mutationFn: (body) => handleClientMethod(client.POST("/admin/ops-tokens", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opsTokensKey }),
  });
}

export function useRevokeOpsToken() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<OpsResponseBody["revokeOpsToken"][200], TanstackError, { id: string }>({
    mutationFn: ({ id }) =>
      handleClientMethod(
        client.POST("/admin/ops-tokens/{id}/revoke", { params: { path: { id } }, body: {} }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opsTokensKey }),
  });
}

export interface AdminLogFilters {
  level?: "error" | "warn" | "info";
  q?: string;
  request_id?: string;
}

/** Persisted logs, newest first, a page at a time (`fetchNextPage`). */
export function useListAdminLogs(filters: Ref<AdminLogFilters>) {
  const client = getClient();
  type Page = OpsResponseBody["listAdminLogs"][200];
  return useInfiniteQuery<Page, TanstackError, InfiniteData<Page, string | undefined>, readonly unknown[], string | undefined>({
    queryKey: computed(() => ["ops", "admin-logs", { ...filters.value }] as const),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const f = filters.value;
      return handleClientMethod(
        client.GET("/admin/logs", {
          params: {
            query: {
              limit: 100,
              ...(f.level ? { level: f.level } : {}),
              ...(f.q ? { q: f.q } : {}),
              ...(f.request_id ? { request_id: f.request_id } : {}),
              ...(pageParam ? { cursor: pageParam } : {}),
            },
          },
        }),
      );
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}
