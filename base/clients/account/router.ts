import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { accountLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
import VerifyEmailAsync from "./pages/email-verification/VerifyEmailAsync.vue";
import EmailVerificationFlowAsync from "./pages/email-verification/EmailVerificationFlowAsync.vue";
import HomeAsync from "./pages/home/HomeAsync.vue";
import ProfileAsync from "./pages/profile/ProfileAsync.vue";
import AccountSettingsSection from "./pages/account-settings/AccountSettingsSection.vue";
// END WORKFLOW AREA

function accountPathSegment(path: string): string {
  return path.replace(/^\//, "");
}

export const createAccountRouter = (options?: {
  history?: RouterHistory;
}) => {
  const routes: RouteRecordRaw[] = [
    // BEGIN WORKFLOW AREA page-routes FOR vue/add-view
    {
      path: accountPathSegment(accountLinks.verifyEmail.path),
      component: VerifyEmailAsync,
    },
    {
      path: accountPathSegment(accountLinks.newVerification.path),
      redirect: (to) => ({
        path: accountLinks.verifyEmail.path,
        query: to.query,
      }),
    },
    {
      path: accountPathSegment(accountLinks.verification.path),
      component: EmailVerificationFlowAsync,
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
    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
  });
};
