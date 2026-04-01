import { useQueryClient } from "@tanstack/vue-query";
import { ref, toValue, type MaybeRefOrGetter } from "vue";
import { useRoute } from "vue-router";
import {
  BrowserLogoutFlowCreated,
  createBrowserLogoutFlowQueryOptions,
} from "@saflib/ory-kratos-sdk";
import { useAuthLoggedOutRootFallbackHref } from "../../../authFallbackInject.ts";

export function useKratosBrowserLogout(options?: {
  /**
   * Kratos `return_to` after logout. When omitted, uses `?return_to=` from the current route if set,
   * otherwise the injected hub root home (logged-out landing).
   */
  afterLogoutReturnTo?: MaybeRefOrGetter<string>;
}) {
  const queryClient = useQueryClient();
  const route = useRoute();
  const rootHomeFallbackHref = useAuthLoggedOutRootFallbackHref();
  const pending = ref(false);

  function resolveReturnTo(): string {
    if (options?.afterLogoutReturnTo !== undefined) {
      return toValue(options.afterLogoutReturnTo);
    }
    const q = route.query.return_to;
    return typeof q === "string" && q.trim()
      ? q.trim()
      : rootHomeFallbackHref.value;
  }

  async function startBrowserLogout() {
    if (pending.value) return;
    pending.value = true;
    try {
      const result = await queryClient.fetchQuery({
        ...createBrowserLogoutFlowQueryOptions({
          returnTo: resolveReturnTo(),
        }),
        staleTime: 0,
      });
      if (!(result instanceof BrowserLogoutFlowCreated)) {
        throw new Error("Browser logout failed");
      }
      window.location.assign(result.flow.logout_url);
    } finally {
      pending.value = false;
    }
  }

  return { pending, startBrowserLogout };
}
