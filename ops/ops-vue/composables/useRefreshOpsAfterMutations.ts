import { onScopeDispose } from "vue";
import { useQueryClient } from "@tanstack/vue-query";

/**
 * Keep the Overview honest: after any mutation succeeds (cancelling jobs,
 * resolving issues, toggling cron, ...), refetch the digest and health
 * checks. Each page invalidates its own lists, but the digest summarizes
 * all of them, and pages from other packages can't know its key. Call once
 * in the admin app's root component.
 */
export function useRefreshOpsAfterMutations() {
  const queryClient = useQueryClient();
  const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "success") {
      void queryClient.invalidateQueries({ queryKey: ["ops", "digest"] });
      void queryClient.invalidateQueries({ queryKey: ["ops", "health"] });
    }
  });
  onScopeDispose(unsubscribe);
}
