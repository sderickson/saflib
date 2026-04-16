import { computed, inject, type ComputedRef, type InjectionKey } from "vue";
import { useRoute } from "vue-router";

// really gotta figure out some better way to handle client-side links
// perhaps set up something in @saflib/vue that is reactive?
import { linkToHref } from "@saflib/links";
const domain = document.location.host.replace("auth.", "");

/** Default post-auth URL when the shell does not set `postAuthFallbackHref` or `postAuthOverrideHref` in `configureAuthApp`. */
export const defaultPostAuthFallbackHref = computed(() =>
  linkToHref({ subdomain: "app", path: "/" }, { domain }),
);

/** Default logged-out root URL when the shell does not set `rootHomeOverrideHref` in `configureAuthApp`. */
export const defaultRootHomeFallbackHref = computed(() =>
  linkToHref({ subdomain: "root", path: "/" }, { domain }),
);

/** Default URL after registration when the shell does not set `postRegisterOverrideHref` in `configureAuthApp`. */
export const defaultPostRegisterFallbackHref = computed(() =>
  linkToHref({ subdomain: "app", path: "/" }, { domain }),
);

/**
 * Resolved post-auth fallback base URL from {@link configureAuthApp} (override, explicit fallback, or library default).
 * {@link AUTH_POST_AUTH_URL_IS_OVERRIDE} is true only when the shell set `postAuthOverrideHref` (then `?return_to=` is ignored).
 */
export const AUTH_POST_AUTH_FALLBACK_HREF: InjectionKey<ComputedRef<string>> =
  Symbol("authPostAuthFallbackHref");

/** True when {@link configureAuthApp} was given `postAuthOverrideHref` (that URL wins; `?return_to=` is ignored). */
export const AUTH_POST_AUTH_URL_IS_OVERRIDE: InjectionKey<ComputedRef<boolean>> =
  Symbol("authPostAuthUrlIsOverride");

/**
 * Resolved logged-out root URL from {@link configureAuthApp} (override or default).
 */
export const AUTH_ROOT_HOME_FALLBACK_HREF: InjectionKey<ComputedRef<string>> =
  Symbol("authRootHomeFallbackHref");

/** True when {@link configureAuthApp} was given `rootHomeOverrideHref`. */
export const AUTH_ROOT_HOME_URL_IS_OVERRIDE: InjectionKey<ComputedRef<boolean>> =
  Symbol("authRootHomeUrlIsOverride");

/**
 * Resolved post-register URL from {@link configureAuthApp} (override or default).
 */
export const AUTH_POST_REGISTER_FALLBACK_HREF: InjectionKey<ComputedRef<string>> =
  Symbol("authPostRegisterFallbackHref");

/** True when {@link configureAuthApp} was given `postRegisterOverrideHref`. */
export const AUTH_POST_REGISTER_URL_IS_OVERRIDE: InjectionKey<ComputedRef<boolean>> =
  Symbol("authPostRegisterUrlIsOverride");

/** Default for URL override flags when `configureAuthApp` was not used. */
export const defaultAuthUrlNotOverride = computed(() => false);

function mergeReturnToQuery(
  route: ReturnType<typeof useRoute>,
  resolvedHref: ComputedRef<string>,
  isOverride: ComputedRef<boolean>,
): ComputedRef<string> {
  return computed(() => {
    if (isOverride.value) return resolvedHref.value;
    const q = route.query.return_to;
    if (typeof q === "string" && q.trim()) return q.trim();
    return resolvedHref.value;
  });
}

/**
 * After login / post-auth: when the shell set `postAuthOverrideHref`, that URL is used and `?return_to=` is ignored.
 * Otherwise `?return_to=` wins when present, then the resolved fallback URL (`postAuthFallbackHref`, else library default).
 */
export function useAuthPostAuthFallbackHref(): ComputedRef<string> {
  const route = useRoute();
  const resolvedHref = inject(
    AUTH_POST_AUTH_FALLBACK_HREF,
    defaultPostAuthFallbackHref,
  );
  const isOverride = inject(
    AUTH_POST_AUTH_URL_IS_OVERRIDE,
    defaultAuthUrlNotOverride,
  );
  return mergeReturnToQuery(route, resolvedHref, isOverride);
}

/**
 * After logout: when the shell set `rootHomeOverrideHref`, that URL is used and `?return_to=` is ignored.
 * Otherwise `?return_to=` wins, then the resolved default URL.
 */
export function useAuthLoggedOutRootFallbackHref(): ComputedRef<string> {
  const route = useRoute();
  const resolvedHref = inject(
    AUTH_ROOT_HOME_FALLBACK_HREF,
    defaultRootHomeFallbackHref,
  );
  const isOverride = inject(
    AUTH_ROOT_HOME_URL_IS_OVERRIDE,
    defaultAuthUrlNotOverride,
  );
  return mergeReturnToQuery(route, resolvedHref, isOverride);
}

/**
 * After registration: when the shell set `postRegisterOverrideHref`, that URL is used and `?return_to=` is ignored.
 * Otherwise `?return_to=` wins, then the resolved default URL.
 */
export function useAuthPostRegisterFallbackHref(): ComputedRef<string> {
  const route = useRoute();
  const resolvedHref = inject(
    AUTH_POST_REGISTER_FALLBACK_HREF,
    defaultPostRegisterFallbackHref,
  );
  const isOverride = inject(
    AUTH_POST_REGISTER_URL_IS_OVERRIDE,
    defaultAuthUrlNotOverride,
  );
  return mergeReturnToQuery(route, resolvedHref, isOverride);
}

export function useAuthPostAuthUrlIsOverride(): ComputedRef<boolean> {
  return inject(AUTH_POST_AUTH_URL_IS_OVERRIDE, defaultAuthUrlNotOverride);
}

export function useAuthPostRegisterUrlIsOverride(): ComputedRef<boolean> {
  return inject(AUTH_POST_REGISTER_URL_IS_OVERRIDE, defaultAuthUrlNotOverride);
}
