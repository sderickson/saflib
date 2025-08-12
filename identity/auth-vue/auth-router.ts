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
} from "@saflib/auth-vue";
import VerifyEmailPageAsync from "./pages/verify-wall/VerifyWallPageAsync.vue";

import { authLinks } from "@saflib/identity-links";

let router: Router;

interface AuthRouterOptions {
  additionalRoutes?: RouteRecordRaw[];
  defaultRedirect: string;
}

export const createAuthRouter = (options: AuthRouterOptions) => {
  if (router) {
    return router;
  }
  const routes: RouteRecordRaw[] = [
    ...(options?.additionalRoutes ?? []),
    { path: authLinks.home.path, component: LoginPage },
    { path: authLinks.login.path, component: LoginPage },
    { path: authLinks.register.path, component: RegisterPage },
    { path: authLinks.forgot.path, component: ForgotPasswordPage },
    { path: authLinks.logout.path, component: LogoutPage },
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
      path: authLinks.verifyWallPage.path,
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
