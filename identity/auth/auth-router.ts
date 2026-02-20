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
import { getRedirectTarget, type RouteLike } from "./redirect.ts";

let router: Router;

interface AuthRouterOptions {
  additionalRoutes?: RouteRecordRaw[];
  registerRedirect?: string;
  loginRedirect?: string;
  logoutRedirect?: string;
  renderPrompt?: boolean;
}

export const createAuthRouter = (options: AuthRouterOptions) => {
  const renderPrompt = options?.renderPrompt !== false;
  if (router) {
    return router;
  }
  const routeProps = (route: unknown, fallback?: string) => ({
    redirectTo: getRedirectTarget(route as RouteLike, fallback),
    renderPrompt,
  });
  const routes: RouteRecordRaw[] = [
    ...(options?.additionalRoutes ?? []),
    {
      path: authLinks.home.path,
      component: LoginPage,
      props: (route) => routeProps(route, options?.loginRedirect),
    },
    {
      path: authLinks.login.path,
      component: LoginPage,
      props: (route) => routeProps(route, options?.loginRedirect),
    },
    {
      path: authLinks.register.path,
      component: RegisterPage,
      props: (route) => routeProps(route, options?.registerRedirect),
    },
    { path: authLinks.forgot.path, component: ForgotPasswordPage },
    {
      path: authLinks.logout.path,
      component: LogoutPage,
      props: (route) => ({ redirectTo: getRedirectTarget(route as RouteLike, options?.logoutRedirect) }),
    },
    {
      path: authLinks.resetPassword.path,
      component: ChangeForgottenPasswordPage,
    },
    {
      path: authLinks.verifyEmail.path,
      component: VerifyEmailPage,
      props: (route) => ({ redirectTo: getRedirectTarget(route as RouteLike, options?.loginRedirect) }),
    },
    {
      path: authLinks.verifyWall.path,
      component: VerifyEmailPageAsync,
      props: (route) => ({ redirectTo: getRedirectTarget(route as RouteLike, options?.loginRedirect) }),
    },
  ];

  router = createRouter({
    history: createWebHistory(),
    routes,
  });
  return router;
};
