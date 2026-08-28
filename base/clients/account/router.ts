import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { accountLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";
import VerifyEmailAsync from "./pages/email-verification/VerifyEmailAsync.vue";
import EmailVerificationFlowAsync from "./pages/email-verification/EmailVerificationFlowAsync.vue";
import HomeAsync from "./pages/home/HomeAsync.vue";
import ProfileAsync from "./pages/profile/ProfileAsync.vue";
import AccountSettingsSection from "./pages/account-settings/AccountSettingsSection.vue";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
// END WORKFLOW AREA

function accountPathSegment(path: string): string {
  return path.replace(/^\//, "");
}

export const createAccountRouter = (options?: {
  history?: RouterHistory;
}) => {
  const routes: RouteRecordRaw[] = [
    {
      path: accountLinks.verifyEmail.path,
      component: VerifyEmailAsync,
      meta: { blankShell: true },
    },
    {
      path: accountLinks.newVerification.path,
      redirect: (to) => ({
        path: accountLinks.verifyEmail.path,
        query: to.query,
      }),
      meta: { blankShell: true },
    },
    {
      path: accountLinks.verification.path,
      component: EmailVerificationFlowAsync,
      meta: { blankShell: true },
    },
    {
      path: accountLinks.home.path,
      component: HomeAsync,
      children: [
        {
          path: "",
          redirect: accountLinks.profile.path,
        },
        {
          path: accountPathSegment(accountLinks.profile.path),
          component: ProfileAsync,
        },
        {
          path: accountPathSegment(accountLinks.email.path),
          component: AccountSettingsSection,
          props: { section: "email" },
        },
        {
          path: accountPathSegment(accountLinks.password.path),
          component: AccountSettingsSection,
          props: { section: "password" },
        },
        {
          path: accountPathSegment(accountLinks.mfa.path),
          component: AccountSettingsSection,
          props: { section: "totp" },
        },
        {
          path: accountPathSegment(accountLinks.sessions.path),
          component: AccountSettingsSection,
          props: { section: "sessions" },
        },
      ],
    },
    // BEGIN WORKFLOW AREA page-routes FOR vue/add-view
    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
  });
};
