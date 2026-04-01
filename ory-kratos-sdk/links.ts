import type { LinkMap } from "@saflib/links";

const subdomain = "auth";

export const authLinks: LinkMap = {
  /** Auth SPA shell home (fallback when a flow has no `return_to`). */
  home: {
    subdomain,
    path: "/",
  },
  // BEGIN WORKFLOW AREA page-links FOR vue/add-view
  /**
   * Kratos registration UI (existing flow). Resume with `params.flow` (Kratos flow id). Do not mix
   * with `return_to` on the same URL — start a browser flow via `/new-registration?return_to=`.
   */
  registration: {
    subdomain,
    path: "/registration",
    params: ["flow"],
  },
  /**
   * Kratos new registration UI (browser flow creation). Use `params.return_to` (full URL) for Kratos
   * `return_to`.
   */
  newRegistration: {
    subdomain,
    path: "/new-registration",
    params: ["return_to"],
  },
  /**
   * Kratos login UI (existing flow). Resume with `params.flow`. Start via `/new-login?return_to=`.
   */
  login: {
    subdomain,
    path: "/login",
    params: ["flow"],
  },
  /**
   * Kratos new login UI (browser flow creation). Use `params.return_to` (full URL) for Kratos
   * `return_to`.
   */
  newLogin: {
    subdomain,
    path: "/new-login",
    params: ["return_to"],
  },
  /**
   * Kratos email verification (code flow). Resume with `params.flow`, optional `params.token` from
   * the courier. Start via `/new-verification?return_to=`.
   */
  verification: {
    subdomain,
    path: "/verification",
    params: ["flow", "token"],
  },
  /**
   * Kratos new verification UI (browser flow creation). Use `params.return_to` for post-verification
   * navigation.
   */
  newVerification: {
    subdomain,
    path: "/new-verification",
    params: ["return_to"],
  },
  /**
   * Shared gate when the user is signed in but email is not verified. Use `params.return_to` (full
   * URL) for where to send them after verification (e.g. recipes home).
   */
  verifyWall: {
    subdomain,
    path: "/verify-wall",
    params: ["return_to"],
  },
  /**
   * Kratos account recovery. Resume with `params.flow` and optional `params.token`. Start a browser
   * flow via `/new-recovery?return_to=` (do not mix `flow` with `return_to` on the same URL).
   */
  recovery: {
    subdomain,
    path: "/recovery",
    params: ["flow", "token", "return_to"],
  },
  /**
   * Kratos new recovery UI (browser flow creation). Use `params.return_to` for post-recovery navigation.
   */
  newRecovery: {
    subdomain,
    path: "/new-recovery",
    params: ["return_to"],
  },
  /**
   * Kratos account settings. Resume with `params.flow` (and optional `return_to`). Start a browser
   * flow via `/new-settings?return_to=` — do not mix `flow` with `return_to` on the same URL.
   */
  settings: {
    subdomain,
    path: "/settings",
    params: ["flow"],
  },
  /**
   * Kratos new settings UI (browser flow creation). Use `params.return_to` for post-settings navigation.
   */
  newSettings: {
    subdomain,
    path: "/new-settings",
    params: ["return_to"],
  },
  // END WORKFLOW AREA
  logout: {
    subdomain,
    path: "/logout",
    params: ["return_to"],
  },
};

export const defaultKratosAuthLinks = authLinks;
