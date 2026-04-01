import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useRoute } from "vue-router";
import { linkToHrefWithHost } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";

function resolveCrossFlowReturnTo(
  route: ReturnType<typeof useRoute>,
  flowReturnTo?: MaybeRefOrGetter<string | null | undefined>,
): string | undefined {
  const q = route.query.return_to;
  if (typeof q === "string" && q.trim()) {
    return q.trim();
  }
  const fr = flowReturnTo != null ? toValue(flowReturnTo) : undefined;
  if (typeof fr === "string" && fr.trim()) {
    return fr.trim();
  }
  return undefined;
}

/** Full URLs for cross-links between auth flows, preserving `?return_to=` or the active flow's `return_to`. */
export function useAuthFlowCrossLinks(
  flowReturnTo?: MaybeRefOrGetter<string | null | undefined>,
) {
  const route = useRoute();
  const returnToOptions = computed(() => {
    const rt = resolveCrossFlowReturnTo(route, flowReturnTo);
    return rt ? ({ params: { return_to: rt } } as const) : undefined;
  });
  const loginHref = computed(() =>
    linkToHrefWithHost(authLinks.kratosNewLogin, returnToOptions.value),
  );
  const registerHref = computed(() =>
    linkToHrefWithHost(authLinks.kratosNewRegistration, returnToOptions.value),
  );
  const recoveryHref = computed(() =>
    linkToHrefWithHost(authLinks.kratosNewRecovery, returnToOptions.value),
  );
  return { loginHref, registerHref, recoveryHref };
}
