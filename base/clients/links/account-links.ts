import type { LinkMap } from "@saflib/links";

const subdomain = "account";

export const accountLinks: LinkMap = {
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
    params: ["return_to"],
  },
  sessions: {
    subdomain,
    path: "/sessions",
  },
  /** Start email verification (creates a Kratos browser flow). */
  verifyEmail: {
    subdomain,
    path: "/verify-email",
    params: ["return_to", "required"],
  },
  /** Resume an active Kratos verification flow (`?flow=`, optional `?token=`). */
  verification: {
    subdomain,
    path: "/verification",
    params: ["flow", "token", "return_to"],
  },
  /** Alias kept for Kratos restart links; redirects to {@link verifyEmail}. */
  newVerification: {
    subdomain,
    path: "/new-verification",
    params: ["return_to"],
  },
  // BEGIN WORKFLOW AREA page-links FOR vue/add-view
  // END WORKFLOW AREA
};
