import type { LinkMap } from "@saflib/links";

const subdomain = "account";

export const accountLinks: LinkMap = {
  // BEGIN WORKFLOW AREA page-links FOR vue/add-view
  home: {
    subdomain,
    path: "/",
  },
  /** Display name and marketing email preferences (product `user_config`). */
  profile: {
    subdomain,
    path: "/profile",
  },
  /** Kratos identity email / profile traits (settings `profile` group). */
  email: {
    subdomain,
    path: "/email",
  },
  password: {
    subdomain,
    path: "/password",
  },
  /** TOTP / authenticator app (settings `totp` group). */
  mfa: {
    subdomain,
    path: "/mfa",
  },
  sessions: {
    subdomain,
    path: "/sessions",
  },
  // END WORKFLOW AREA
};
