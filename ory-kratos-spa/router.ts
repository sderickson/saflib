import type { RouterHistory } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";
import { PageNotFound } from "@saflib/vue/components";
import { authLinks } from "@saflib/ory-kratos-sdk/links";

// BEGIN SORTED WORKFLOW AREA page-imports FOR vue/add-view
import KratosLoginAsync from "./pages/kratos/login/LoginAsync.vue";
import KratosNewLoginAsync from "./pages/kratos/new-login/NewLoginAsync.vue";
import KratosSettingsAsync from "./pages/kratos/settings/SettingsAsync.vue";
import KratosNewSettingsAsync from "./pages/kratos/new-settings/NewSettingsAsync.vue";
import KratosRegistrationAsync from "./pages/kratos/registration/RegistrationAsync.vue";
import KratosNewRegistrationAsync from "./pages/kratos/new-registration/NewRegistrationAsync.vue";
import KratosVerificationAsync from "./pages/kratos/verification/VerificationAsync.vue";
import KratosNewVerificationAsync from "./pages/kratos/new-verification/NewVerificationAsync.vue";
import KratosRecoveryAsync from "./pages/kratos/recovery/RecoveryAsync.vue";
import KratosNewRecoveryAsync from "./pages/kratos/new-recovery/NewRecoveryAsync.vue";
import KratosVerifyWallAsync from "./pages/kratos/verify-wall/VerifyWallAsync.vue";
import LogoutAsync from "./pages/kratos/logout/LogoutAsync.vue";
// END WORKFLOW AREA

export const createAuthRouter = (options?: { history?: RouterHistory }) => {
  return createRouter({
    history: options?.history ?? createWebHistory(),
    routes: [
      /**
       * Auth SPA home: start sign-in from `/new-login` (browser flow creation). Preserves query.
       */
      {
        path: "/",
        redirect: (to) => ({
          path: authLinks.kratosNewLogin.path,
          query: to.query,
        }),
      },
      // BEGIN WORKFLOW AREA page-routes FOR vue/add-view
      {
        path: authLinks.kratosRegistration.path,
        component: KratosRegistrationAsync,
      },
      {
        path: authLinks.kratosNewRegistration.path,
        component: KratosNewRegistrationAsync,
      },
      {
        path: authLinks.kratosLogin.path,
        component: KratosLoginAsync,
      },
      {
        path: authLinks.kratosNewLogin.path,
        component: KratosNewLoginAsync,
      },
      {
        path: authLinks.kratosVerification.path,
        component: KratosVerificationAsync,
      },
      {
        path: authLinks.kratosNewVerification.path,
        component: KratosNewVerificationAsync,
      },
      {
        path: authLinks.kratosRecovery.path,
        component: KratosRecoveryAsync,
      },
      {
        path: authLinks.kratosNewRecovery.path,
        component: KratosNewRecoveryAsync,
      },
      {
        path: authLinks.kratosSettings.path,
        component: KratosSettingsAsync,
      },
      {
        path: authLinks.kratosNewSettings.path,
        component: KratosNewSettingsAsync,
      },
      {
        path: authLinks.kratosVerifyWall.path,
        component: KratosVerifyWallAsync,
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
