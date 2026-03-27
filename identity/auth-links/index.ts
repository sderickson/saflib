import type { LinkMap } from "@saflib/links";

const subdomain = "auth";

/**
 * Links to pages in the auth client.
 */
export const authLinks = {
  home: {
    subdomain,
    path: "/",
  },
  login: {
    subdomain,
    path: "/login",
    params: ["return_to"],
  },
  register: {
    subdomain,
    path: "/register",
    params: ["return_to"],
  },
  forgot: {
    subdomain,
    path: "/forgot",
  },
  logout: {
    subdomain,
    path: "/logout",
    params: ["return_to"],
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
  verifyWall: {
    subdomain,
    path: "/verify-wall",
  },
} satisfies LinkMap;
