import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";

export function useRestoreBackup() {
  const queryClient = useQueryClient();

  const mutationFn = (backupId: string) => {
    return handleClientMethod(
      getClient().POST("/backups/{backupId}/restore", {
        params: { path: { backupId } },
      }),
    );
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups", "list"] });
    },
  });
}
