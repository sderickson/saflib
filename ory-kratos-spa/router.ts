import type { RouteRecordRaw, RouterHistory } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";
import { PageNotFound } from "@saflib/vue/components";
import { authLinks } from "@saflib/ory-kratos-sdk/links";

// BEGIN SORTED WORKFLOW AREA page-imports FOR vue/add-view
import loginAsync from "./pages/login/LoginAsync.vue";
import newLoginAsync from "./pages/new-login/NewLoginAsync.vue";
import settingsAsync from "./pages/settings/SettingsAsync.vue";
import newSettingsAsync from "./pages/new-settings/NewSettingsAsync.vue";
import registrationAsync from "./pages/registration/RegistrationAsync.vue";
import newRegistrationAsync from "./pages/new-registration/NewRegistrationAsync.vue";
import verificationAsync from "./pages/verification/VerificationAsync.vue";
import newVerificationAsync from "./pages/new-verification/NewVerificationAsync.vue";
import recoveryAsync from "./pages/recovery/RecoveryAsync.vue";
import newRecoveryAsync from "./pages/new-recovery/NewRecoveryAsync.vue";
import verifyWallAsync from "./pages/verify-wall/VerifyWallAsync.vue";
import LogoutAsync from "./pages/logout/LogoutAsync.vue";
// END WORKFLOW AREA

export interface CreateKratosAuthRouterOptions {
  history?: RouterHistory;
  additionalRoutes?: RouteRecordRaw[];
}

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
        path: authLinks.settings.path,
        component: settingsAsync,
      },
      {
        path: authLinks.newSettings.path,
        component: newSettingsAsync,
      },
      {
        path: authLinks.verifyWall.path,
        component: verifyWallAsync,
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
