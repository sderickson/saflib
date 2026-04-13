import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from "vue";

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

export const AUTH_APP_CONFIG: InjectionKey<ComputedRef<AuthAppConfig>> =
  Symbol("authAppConfig");

const fallbackAuthAppConfig = computed<AuthAppConfig>(
  () => defaultAuthAppConfig,
);

/**
 * Call once from the auth shell (e.g. `AuthApp.vue`) to provide options for nested Kratos pages.
 * Uses the same provide/inject pattern as {@link AUTH_POST_AUTH_FALLBACK_HREF}.
 */
export function configureAuthApp(
  options: MaybeRefOrGetter<Partial<AuthAppConfig>> = {},
): ComputedRef<AuthAppConfig> {
  const config = computed<AuthAppConfig>(() => ({
    ...defaultAuthAppConfig,
    ...toValue(options),
  }));
  provide(AUTH_APP_CONFIG, config);
  return config;
}

export function useAuthAppConfig(): ComputedRef<AuthAppConfig> {
  return inject(AUTH_APP_CONFIG, fallbackAuthAppConfig);
}
