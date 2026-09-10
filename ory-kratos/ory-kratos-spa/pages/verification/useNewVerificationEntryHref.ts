import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useRoute } from "vue-router";
import { linkToHrefWithHost } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";

/**
 * Full URL to `/new-verification`, preserving `?return_to=` or the active `VerificationFlow`'s
 * `return_to` (Kratos does not echo `return_to` on `/verification?flow=` URLs).
 */
export function useNewVerificationEntryHref(
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
      ? linkToHrefWithHost(authLinks.newVerification, {
          params: { return_to: rt },
        })
      : linkToHrefWithHost(authLinks.newVerification);
  });
}
