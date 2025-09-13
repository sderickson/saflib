import { useQuery } from "@tanstack/vue-query";
import { getClient } from "./client";
import type { IdentityResponseBody } from "@saflib/identity-spec";
import { handleClientMethod } from "@saflib/sdk";
import { TanstackError } from "@saflib/sdk";
export const useUsersQuery = () => {
  return useQuery<IdentityResponseBody["listUsers"][200], TanstackError>({
    queryKey: ["auth", "users"],
    queryFn: async () => {
      return handleClientMethod(getClient().GET("/users"));
    },
  });
};
