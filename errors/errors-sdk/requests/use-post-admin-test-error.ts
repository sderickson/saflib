import { useMutation } from "@tanstack/vue-query";
import { TanstackError } from "@saflib/sdk";
import { postAdminTestError } from "./post-admin-test-error.ts";

export function usePostAdminTestErrorMutation(subdomain: string) {
  return useMutation<void, TanstackError, void>({
    mutationFn: () => postAdminTestError(subdomain),
  });
}
