import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
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
