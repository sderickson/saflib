import { createAuthRouter } from "./auth-router";

export const router = createAuthRouter({
  defaultRedirect: "/",
});
