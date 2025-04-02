import { createWebHistory, createRouter } from "vue-router";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  LogoutPage,
  ChangeForgottenPasswordPage,
} from "@saflib/auth-vue";

const routes = [
  { path: "/", component: LoginPage },
  { path: "/login", component: LoginPage },
  { path: "/register", component: RegisterPage },
  { path: "/forgot", component: ForgotPasswordPage },
  { path: "/logout", component: LogoutPage },
  { path: "/reset-password", component: ChangeForgottenPasswordPage },
];

export const router = createRouter({
  history: createWebHistory("/auth"),
  routes,
});
