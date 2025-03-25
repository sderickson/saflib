import { createWebHistory, createRouter } from "vue-router";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  LogoutPage,
} from "@saflib/auth-vue";

const routes = [
  { path: "/", component: LoginPage },
  { path: "/login", component: LoginPage },
  { path: "/register", component: RegisterPage },
  { path: "/forgot", component: ForgotPasswordPage },
  { path: "/logout", component: LogoutPage },
];

export const router = createRouter({
  history: createWebHistory("/auth"),
  routes,
});
