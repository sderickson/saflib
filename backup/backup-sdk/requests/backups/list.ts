import { queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";

export const listBackups = () => {
  return queryOptions({
    queryKey: ["backups", "list"],
    queryFn: async () => {
      return handleClientMethod(getClient().GET("/backups"));
    },
  });
};
