import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { AuditResponseBody } from "@saflib/audit-spec/types";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export type SealAuditLogMutationResult =
  | AuditResponseBody["sealAuditLog"][200]
  | AuditResponseBody["sealAuditLog"][409];

export async function sealAuditLog(): Promise<SealAuditLogMutationResult> {
  const client = getClient();
  const result = await client.POST("/audit-logs/seal", {});

  if (result.response.status === 409) {
    const payload = result.error as SealAuditLogMutationResult | undefined;
    if (payload?.auditSealResult !== undefined) {
      return payload;
    }
    throw new TanstackError(409, "SEAL_SKIPPED_UNEXPECTED_BODY");
  }

  return handleClientMethod(
    Promise.resolve(result) as Parameters<
      typeof handleClientMethod<SealAuditLogMutationResult>
    >[0],
  );
}

export function useSealAuditLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sealAuditLog(),
    onSuccess: (data) => {
      if (data.auditSealResult.status === "sealed") {
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      }
    },
  });
}
