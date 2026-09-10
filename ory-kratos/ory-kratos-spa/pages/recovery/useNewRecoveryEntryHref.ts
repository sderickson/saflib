import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useRoute } from "vue-router";
import { linkToHrefWithHost } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";

/**
 * Full URL to `/new-recovery`, preserving `?return_to=` or the active flow's `return_to`.
 */
export function useNewRecoveryEntryHref(
  flowReturnTo?: MaybeRefOrGetter<string | null | undefined>,
) {
  const route = useRoute();
  return computed(() => {
    const fromQuery =
      typeof route.query.return_to === "string" && route.query.return_to.trim()
        ? route.query.return_to.trim()
        : undefined;
    const fromFlow =
      flowReturnTo != null
        ? toValue(flowReturnTo)?.trim() || undefined
        : undefined;
    const rt = fromQuery ?? fromFlow;
    return rt
      ? linkToHrefWithHost(authLinks.newRecovery, {
          params: { return_to: rt },
        })
      : linkToHrefWithHost(authLinks.newRecovery);
  });
}
