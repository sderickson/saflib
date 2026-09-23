import { queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import type { Backup } from "@saflib/backup-spec";
import { getClient } from "../../client.ts";

export const listBackups = () => {
  return queryOptions({
    queryKey: ["backups", "list"],
    queryFn: async (): Promise<Backup[]> => {
      return handleClientMethod(getClient().GET("/backups"));
    },
  });
};
