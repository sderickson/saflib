import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from "vue";
import {
  AUTH_POST_AUTH_FALLBACK_HREF,
  AUTH_POST_AUTH_URL_IS_OVERRIDE,
  AUTH_POST_REGISTER_FALLBACK_HREF,
  AUTH_POST_REGISTER_URL_IS_OVERRIDE,
  AUTH_ROOT_HOME_FALLBACK_HREF,
  AUTH_ROOT_HOME_URL_IS_OVERRIDE,
  defaultPostAuthFallbackHref,
  defaultPostRegisterFallbackHref,
  defaultRootHomeFallbackHref,
} from "./authFallbackInject.ts";

export interface AuthAppConfig {
  /**
   * When false, Kratos flow pages hide built-in H1 titles (e.g. "Create your account")
   * so a host layout can supply its own headings.
   */
  showFlowHeaders: boolean;
}

const defaultAuthAppConfig: AuthAppConfig = {
  showFlowHeaders: true,
};

export interface ConfigureAuthAppOptions extends Partial<AuthAppConfig> {
  /**
   * When set, this URL is used for post-login redirects and `?return_to=` is ignored.
   * When omitted, `?return_to=` is honored, then the default app home URL.
   * See {@link AUTH_POST_AUTH_FALLBACK_HREF}.
   */
  postAuthOverrideHref?: MaybeRefOrGetter<string>;
  /**
   * When set, this URL is used after logout and `?return_to=` is ignored.
   * When omitted, `?return_to=` is honored, then the default root home URL.
   * See {@link AUTH_ROOT_HOME_FALLBACK_HREF}.
   */
  rootHomeOverrideHref?: MaybeRefOrGetter<string>;
  /**
   * When set, this URL is used after registration (and on the verify wall) and `?return_to=` is ignored.
   * When omitted, `?return_to=` is honored, then the default URL.
   * See {@link AUTH_POST_REGISTER_FALLBACK_HREF}.
   */
  postRegisterOverrideHref?: MaybeRefOrGetter<string>;
}

export const AUTH_APP_CONFIG: InjectionKey<ComputedRef<AuthAppConfig>> =
  Symbol("authAppConfig");

const fallbackAuthAppConfig = computed<AuthAppConfig>(
  () => defaultAuthAppConfig,
);

/**
 * Call once from the auth shell (e.g. `AuthApp.vue`) to provide options for nested Kratos pages,
 * including post-auth, post-register, and logged-out root URLs.
 */
export function configureAuthApp(
  options: MaybeRefOrGetter<ConfigureAuthAppOptions> = {},
): ComputedRef<AuthAppConfig> {
  const config = computed<AuthAppConfig>(() => {
    const o = toValue(options);
    return {
      ...defaultAuthAppConfig,
      showFlowHeaders:
        o.showFlowHeaders ?? defaultAuthAppConfig.showFlowHeaders,
    };
  });
  provide(AUTH_APP_CONFIG, config);

  const postAuthOverride = computed(
    () => toValue(options).postAuthOverrideHref !== undefined,
  );
  provide(AUTH_POST_AUTH_URL_IS_OVERRIDE, postAuthOverride);

  const postAuthHref = computed(() => {
    const o = toValue(options);
    if (o.postAuthOverrideHref !== undefined) {
      return toValue(o.postAuthOverrideHref);
    }
    return defaultPostAuthFallbackHref.value;
  });
  provide(AUTH_POST_AUTH_FALLBACK_HREF, postAuthHref);

  const postRegisterOverride = computed(
    () => toValue(options).postRegisterOverrideHref !== undefined,
  );
  provide(AUTH_POST_REGISTER_URL_IS_OVERRIDE, postRegisterOverride);

  const postRegisterHref = computed(() => {
    const o = toValue(options);
    if (o.postRegisterOverrideHref !== undefined) {
      return toValue(o.postRegisterOverrideHref);
    }
    return defaultPostRegisterFallbackHref.value;
  });
  provide(AUTH_POST_REGISTER_FALLBACK_HREF, postRegisterHref);

  const rootHomeOverride = computed(
    () => toValue(options).rootHomeOverrideHref !== undefined,
  );
  provide(AUTH_ROOT_HOME_URL_IS_OVERRIDE, rootHomeOverride);

  const rootHomeHref = computed(() => {
    const o = toValue(options);
    if (o.rootHomeOverrideHref !== undefined) {
      return toValue(o.rootHomeOverrideHref);
    }
    return defaultRootHomeFallbackHref.value;
  });
  provide(AUTH_ROOT_HOME_FALLBACK_HREF, rootHomeHref);

  return config;
}

export function useAuthAppConfig(): ComputedRef<AuthAppConfig> {
  return inject(AUTH_APP_CONFIG, fallbackAuthAppConfig);
}
