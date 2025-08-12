import type { LinkMap } from "@saflib/links";

const subdomain = "auth";

export const authLinks = {
  home: {
    subdomain,
    path: "/",
  },
  login: {
    subdomain,
    path: "/login",
    params: ["redirect"],
  },
  register: {
    subdomain,
    path: "/register",
  },
  forgot: {
    subdomain,
    path: "/forgot",
  },
  logout: {
    subdomain,
    path: "/logout",
  },
  resetPassword: {
    subdomain,
    path: "/reset-password",
    params: ["token"],
  },
  verifyEmail: {
    subdomain,
    path: "/verify-email",
    params: ["token"],
  },
  verifyEmailPage: {
    subdomain,
    path: "/verify-email-page",
  },
} satisfies LinkMap;
