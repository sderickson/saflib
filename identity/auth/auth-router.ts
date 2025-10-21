import {
  createWebHistory,
  createRouter,
  type Router,
  type RouteRecordRaw,
} from "vue-router";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  LogoutPage,
  ChangeForgottenPasswordPage,
  VerifyEmailPage,
} from "@saflib/auth";
import VerifyEmailPageAsync from "./pages/verify-wall/VerifyWallPageAsync.vue";

import { authLinks } from "@saflib/auth-links";

let router: Router;

interface AuthRouterOptions {
  additionalRoutes?: RouteRecordRaw[];
  defaultRedirect: string;
  renderPrompt?: boolean;
}

export const createAuthRouter = (options: AuthRouterOptions) => {
  const renderPrompt = options?.renderPrompt !== false;
  if (router) {
    return router;
  }
  const routes: RouteRecordRaw[] = [
    ...(options?.additionalRoutes ?? []),
    {
      path: authLinks.home.path,
      component: LoginPage,
      props: { redirectTo: options?.defaultRedirect, renderPrompt },
    },
    {
      path: authLinks.login.path,
      component: LoginPage,
      props: { redirectTo: options?.defaultRedirect, renderPrompt },
    },
    {
      path: authLinks.register.path,
      component: RegisterPage,
      props: { redirectTo: options?.defaultRedirect, renderPrompt },
    },
    { path: authLinks.forgot.path, component: ForgotPasswordPage },
    {
      path: authLinks.logout.path,
      component: LogoutPage,
      props: { redirectTo: options?.defaultRedirect },
    },
    {
      path: authLinks.resetPassword.path,
      component: ChangeForgottenPasswordPage,
    },
    {
      path: authLinks.verifyEmail.path,
      component: VerifyEmailPage,
      props: { redirectTo: options?.defaultRedirect },
    },
    {
      path: authLinks.verifyWall.path,
      component: VerifyEmailPageAsync,
      props: { redirectTo: options?.defaultRedirect },
    },
  ];

  router = createRouter({
    history: createWebHistory(),
    routes,
  });
  return router;
};
