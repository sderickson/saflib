import { computed } from "vue";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
import { useOpsAccess } from "@saflib/ops-vue";

/**
 * True when the signed-in user is a site admin (nav chrome only; the server
 * enforces access). Asks the API (`GET /ops/access`), so admin emails stay
 * server-side instead of being baked into client code.
 */
export function useSiteAdmin() {
  const { data: session } = useKratosSession();
  const signedIn = computed(() => Boolean(session.value?.identity));
  const { isSiteAdmin } = useOpsAccess("api", signedIn);
  return { isSiteAdmin };
}
