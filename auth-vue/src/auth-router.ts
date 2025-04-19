import { createWebHistory, createRouter, type Router } from "vue-router";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  LogoutPage,
  ChangeForgottenPasswordPage,
  VerifyEmailPage,
} from "@saflib/auth-vue";

let router: Router;

export const createAuthRouter = () => {
  if (router) {
    return router;
  }
  const routes = [
    { path: "/", component: LoginPage },
    { path: "/login", component: LoginPage },
    { path: "/register", component: RegisterPage },
    { path: "/forgot", component: ForgotPasswordPage },
    { path: "/logout", component: LogoutPage },
    { path: "/reset-password", component: ChangeForgottenPasswordPage },
    { path: "/verify-email", component: VerifyEmailPage },
  ];

  router = createRouter({
    history: createWebHistory("/auth"),
    routes,
  });
  return router;
};
