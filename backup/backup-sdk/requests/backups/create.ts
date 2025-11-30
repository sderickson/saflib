import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";

type CreateBackupBody = {
  description?: string;
  tags?: string[];
};

export function useCreateBackup() {
  const queryClient = useQueryClient();

  const mutationFn = (body?: CreateBackupBody) => {
    return handleClientMethod(
      getClient().POST("/backups", { body }),
    );
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups", "list"] });
    },
  });
}
