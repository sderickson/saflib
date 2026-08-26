import { queryOptions } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../../client.ts";
import type { Ref } from "vue";

/** Stable query key for `GET /admin/users/by-id`. */
export function getUsersByIdAdminQueryKey(userId: string) {
  return ["admin", "users-by-id", userId] as const;
}

export const getUsersByIdAdminQuery = (userId: Ref<string>) => {
  return queryOptions({
    queryKey: ["admin", "users-by-id", userId],
    queryFn: async () =>
      handleClientMethod(
        getClient().GET("/admin/users/by-id", {
          params: { query: { id: userId.value } },
        }),
      ),
    enabled: () => userId.value.length > 0,
  });
};
