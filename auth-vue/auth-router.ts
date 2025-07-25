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

import { authLinks } from "@saflib/auth-links";

let router: Router;

export const createAuthRouter = (additionalRoutes?: RouteRecordRaw[]) => {
  if (router) {
    return router;
  }
  const routes: RouteRecordRaw[] = [
    ...(additionalRoutes ?? []),
    { path: authLinks.home.path, component: LoginPage },
    { path: authLinks.login.path, component: LoginPage },
    { path: authLinks.register.path, component: RegisterPage },
    { path: authLinks.forgot.path, component: ForgotPasswordPage },
    { path: authLinks.logout.path, component: LogoutPage },
    {
      path: authLinks.resetPassword.path,
      component: ChangeForgottenPasswordPage,
    },
    { path: authLinks.verifyEmail.path, component: VerifyEmailPage },
  ];

  router = createRouter({
    history: createWebHistory(),
    routes,
  });
  return router;
};
