import { useQuery } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthResponse } from "@saflib/identity-spec";
import { handleClientMethod } from "@saflib/vue-spa";
import { TanstackError } from "@saflib/vue-spa";
export const useUsersQuery = () => {
  return useQuery<AuthResponse["listUsers"][200], TanstackError>({
    queryKey: ["auth", "users"],
    queryFn: async () => {
      return handleClientMethod(client.GET("/users"));
    },
  });
};
