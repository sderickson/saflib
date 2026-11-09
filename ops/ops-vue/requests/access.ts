import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { createSafClient } from "@saflib/sdk";
import type { OpsResponseBody, paths } from "@saflib/ops-spec";

const clients = new Map<string, ReturnType<typeof createSafClient<paths>>>();

function clientFor(apiSubdomain: string) {
  let client = clients.get(apiSubdomain);
  if (!client) {
    client = createSafClient<paths>(apiSubdomain);
    clients.set(apiSubdomain, client);
  }
  return client;
}

type Access = OpsResponseBody["getOpsAccess"][200]["access"];

/**
 * The signed-in user's admin access, from the product API (`GET /ops/access`),
 * for nav chrome such as an "Admin" link. Takes the API subdomain explicitly
 * because it runs in every SPA, not only admin. Only queries while `enabled`
 * (e.g. once a Kratos session exists); otherwise, and on any error, reports
 * no access.
 */
export function useOpsAccess(apiSubdomain: string, enabled: Ref<boolean>) {
  const query = useQuery<Access>({
    queryKey: ["ops", "access", apiSubdomain],
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data } = await clientFor(apiSubdomain).GET("/ops/access", {});
      return data?.access ?? { signed_in: false, site_admin: false, mfa_completed: false };
    },
  });
  return {
    isSiteAdmin: computed(() => enabled.value && query.data.value?.site_admin === true),
    access: query.data,
  };
}
