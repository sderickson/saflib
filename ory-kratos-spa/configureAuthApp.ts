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
  AUTH_POST_REGISTER_FALLBACK_HREF,
  AUTH_ROOT_HOME_FALLBACK_HREF,
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
   * Overrides the default post-auth landing URL (`app.`…`/`).
   * See {@link AUTH_POST_AUTH_FALLBACK_HREF}.
   */
  postAuthFallbackHref?: MaybeRefOrGetter<string>;
  /**
   * Overrides the default logged-out root home URL (marketing site).
   * See {@link AUTH_ROOT_HOME_FALLBACK_HREF}.
   */
  rootHomeFallbackHref?: MaybeRefOrGetter<string>;
  /**
   * Where to send users after **registration** completes (when `?return_to=` is absent).
   * Login still uses {@link ConfigureAuthAppOptions.postAuthFallbackHref}.
   * See {@link AUTH_POST_REGISTER_FALLBACK_HREF}.
   */
  postRegisterFallbackHref?: MaybeRefOrGetter<string>;
}

export const AUTH_APP_CONFIG: InjectionKey<ComputedRef<AuthAppConfig>> =
  Symbol("authAppConfig");

const fallbackAuthAppConfig = computed<AuthAppConfig>(
  () => defaultAuthAppConfig,
);

/**
 * Call once from the auth shell (e.g. `AuthApp.vue`) to provide options for nested Kratos pages,
 * including post-auth, post-register, and logged-out root URLs ({@link AUTH_POST_AUTH_FALLBACK_HREF},
 * {@link AUTH_POST_REGISTER_FALLBACK_HREF}, {@link AUTH_ROOT_HOME_FALLBACK_HREF}).
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

  const postAuthHref = computed(() => {
    const o = toValue(options);
    if (o.postAuthFallbackHref !== undefined) {
      return toValue(o.postAuthFallbackHref);
    }
    return defaultPostAuthFallbackHref.value;
  });
  provide(AUTH_POST_AUTH_FALLBACK_HREF, postAuthHref);

  const postRegisterHref = computed(() => {
    const o = toValue(options);
    if (o.postRegisterFallbackHref !== undefined) {
      return toValue(o.postRegisterFallbackHref);
    }
    return defaultPostRegisterFallbackHref.value;
  });
  provide(AUTH_POST_REGISTER_FALLBACK_HREF, postRegisterHref);

  const rootHomeHref = computed(() => {
    const o = toValue(options);
    if (o.rootHomeFallbackHref !== undefined) {
      return toValue(o.rootHomeFallbackHref);
    }
    return defaultRootHomeFallbackHref.value;
  });
  provide(AUTH_ROOT_HOME_FALLBACK_HREF, rootHomeHref);

  return config;
}

export function useAuthAppConfig(): ComputedRef<AuthAppConfig> {
  return inject(AUTH_APP_CONFIG, fallbackAuthAppConfig);
}
