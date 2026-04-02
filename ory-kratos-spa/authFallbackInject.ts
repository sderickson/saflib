import {
  computed,
  inject,
  ref,
  type Ref,
  type ComputedRef,
  type InjectionKey,
} from "vue";
import { useRoute } from "vue-router";

// really gotta figure out some better way to handle client-side links
// perhaps set up something in @saflib/vue that is reactive?
import { linkToHref } from "@saflib/links";
const domain = document.location.host.replace("auth.", "");
const defaultPostAuthFallbackHref = computed(() =>
  linkToHref({ subdomain: "app", path: "/" }, { domain }),
);
const defaultRootHomeFallbackHref = computed(() =>
  linkToHref({ subdomain: "root", path: "/" }, { domain }),
);

/**
 * Full URL for the hub **app** home (`app.`…`/`), used when `?return_to=` is absent: Kratos
 * `return_to`, post-login / post-verification navigation, verify-wall fallback, etc.
 * {@link AuthSpa.vue} provides this; composables fall back to the same hub-links resolution if missing.
 */
export const AUTH_POST_AUTH_FALLBACK_HREF: InjectionKey<ComputedRef<string>> =
  Symbol("authPostAuthFallbackHref");

/**
 * Full URL for the hub **root** home (`/` on the root domain), used when logging out without
 * `?return_to=` so the browser lands on the logged-out marketing site.
 */
export const AUTH_ROOT_HOME_FALLBACK_HREF: InjectionKey<ComputedRef<string>> =
  Symbol("authRootHomeFallbackHref");

/**
 * Returns a url to return to after authentication, either from the `?return_to=` query parameter or the default post-auth fallback URL.
 */
export function useAuthPostAuthFallbackHref(): Ref<string> {
  const route = useRoute();
  const returnTo = route.query.return_to;
  if (typeof returnTo === "string") {
    return ref(returnTo.trim());
  }
  return inject(AUTH_POST_AUTH_FALLBACK_HREF, defaultPostAuthFallbackHref);
}

/**
 * Returns a url to return to after logging out, either from the `?return_to=` query parameter or the default logged-out root home URL.
 */
export function useAuthLoggedOutRootFallbackHref(): Ref<string> {
  const route = useRoute();
  const returnTo = route.query.return_to;
  if (typeof returnTo === "string") {
    return ref(returnTo.trim());
  }
  return inject(AUTH_ROOT_HOME_FALLBACK_HREF, defaultRootHomeFallbackHref);
}
