import { computed, type ComputedRef } from "vue";
import { linkToHrefWithHost } from "@saflib/links";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import { appLinks } from "@saflib/base-links";

/** Label for the primary call to action when the visitor is signed in. */
export const SIGNED_IN_CTA_LABEL = "Open the app";

/**
 * Primary call to action for marketing sections. Signed-out visitors go to
 * registration (then on to the app); signed-in visitors go straight to the
 * app, with `signedInLabel`. An explicit `ctaHref` always wins.
 */
export function useSessionCta(
  props: { ctaHref?: string; ctaLabel?: string },
  labels: { signedOut: string; signedIn?: string },
): {
  signedIn: ComputedRef<boolean>;
  href: ComputedRef<string>;
  label: ComputedRef<string>;
} {
  const { data: session } = useKratosSession();
  const signedIn = computed(() => !!session.value);
  const href = computed(() => {
    if (props.ctaHref) return props.ctaHref;
    const appHref = linkToHrefWithHost(appLinks.home);
    if (signedIn.value) return appHref;
    return linkToHrefWithHost(authLinks.newRegistration, {
      params: { return_to: appHref },
    });
  });
  const label = computed(() => {
    if (signedIn.value && !props.ctaHref) {
      return labels.signedIn ?? SIGNED_IN_CTA_LABEL;
    }
    return props.ctaLabel ?? labels.signedOut;
  });
  return { signedIn, href, label };
}
