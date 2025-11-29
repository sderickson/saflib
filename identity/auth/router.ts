import { createAuthRouter } from "./auth-router";

export const router = createAuthRouter({
  registerRedirect: "/",
  loginRedirect: "/",
  logoutRedirect: "/",
});
