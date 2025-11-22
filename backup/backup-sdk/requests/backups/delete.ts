import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";

export function useDeleteBackup() {
  const queryClient = useQueryClient();

  const mutationFn = (backupId: string) => {
    return handleClientMethod(
      getClient().DELETE("/backups/{backupId}", {
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
