import { createWebHistory, createRouter } from "vue-router";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  LogoutPage,
  ChangeForgottenPasswordPage,
  VerifyEmailPage,
} from "@saflib/auth-vue";

export const createAuthRouter = () => {
  const routes = [
    { path: "/", component: LoginPage },
    { path: "/login", component: LoginPage },
    { path: "/register", component: RegisterPage },
    { path: "/forgot", component: ForgotPasswordPage },
    { path: "/logout", component: LogoutPage },
    { path: "/reset-password", component: ChangeForgottenPasswordPage },
    { path: "/verify-email", component: VerifyEmailPage },
  ];

  return createRouter({
    history: createWebHistory("/auth"),
    routes,
  });
};
