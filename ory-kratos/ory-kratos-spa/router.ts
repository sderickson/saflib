import type { RouteRecordRaw, RouterHistory } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";
import { PageNotFound } from "@saflib/vue/components";
import { authLinks } from "@saflib/ory-kratos-sdk/links";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
import loginAsync from "./pages/login/LoginAsync.vue";
import newLoginAsync from "./pages/new-login/NewLoginAsync.vue";
import registrationAsync from "./pages/registration/RegistrationAsync.vue";
import newRegistrationAsync from "./pages/new-registration/NewRegistrationAsync.vue";
import verificationAsync from "./pages/verification/VerificationAsync.vue";
import newVerificationAsync from "./pages/new-verification/NewVerificationAsync.vue";
import recoveryAsync from "./pages/recovery/RecoveryAsync.vue";
import newRecoveryAsync from "./pages/new-recovery/NewRecoveryAsync.vue";
import LogoutAsync from "./pages/logout/LogoutAsync.vue";
// END WORKFLOW AREA

export interface CreateKratosAuthRouterOptions {
  history?: RouterHistory;
  /**
   * Prepended ahead of built-in logged-out routes (e.g. product registration
   * override, or {@link kratosSessionRouteRecords} for settings / verify-wall).
   */
  additionalRoutes?: RouteRecordRaw[];
}

/**
 * Logged-out Kratos browser flows for the auth SPA, plus logout as the
 * session-exit route on the auth subdomain.
 *
 * Does **not** mount settings or verify-wall. Embed settings via
 * `@saflib/ory-kratos-spa/settings` on account (or another SPA), or spread
 * {@link kratosSessionRouteRecords} into `additionalRoutes` when those pages
 * should live on auth.
 */
export const createKratosAuthRouter = (
  options?: CreateKratosAuthRouterOptions,
) => {
  return createRouter({
    history: options?.history ?? createWebHistory(),
    routes: [
      ...(options?.additionalRoutes ?? []),
      /**
       * Auth SPA home: start sign-in from `/new-login` (browser flow creation). Preserves query.
       */
      {
        path: "/",
        redirect: (to) => ({
          path: authLinks.newLogin.path,
          query: to.query,
        }),
      },
      // BEGIN WORKFLOW AREA page-routes FOR vue/add-view
      {
        path: authLinks.registration.path,
        component: registrationAsync,
      },
      {
        path: authLinks.newRegistration.path,
        component: newRegistrationAsync,
      },
      {
        path: authLinks.login.path,
        component: loginAsync,
      },
      {
        path: authLinks.newLogin.path,
        component: newLoginAsync,
      },
      {
        path: authLinks.verification.path,
        component: verificationAsync,
      },
      {
        path: authLinks.newVerification.path,
        component: newVerificationAsync,
      },
      {
        path: authLinks.recovery.path,
        component: recoveryAsync,
      },
      {
        path: authLinks.newRecovery.path,
        component: newRecoveryAsync,
      },
      {
        path: authLinks.logout.path,
        component: LogoutAsync,
      },
      // END WORKFLOW AREA
      { path: "/:pathMatch(.*)*", component: PageNotFound },
    ],
  });
};
