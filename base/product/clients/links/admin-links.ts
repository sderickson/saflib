import type { LinkMap } from "@saflib/links";

const subdomain = "admin";

export const adminLinks: LinkMap = {
  home: {
    subdomain,
    path: "/",
  },
  users: {
    subdomain,
    path: "/users",
  },
  cronJobs: {
    subdomain,
    path: "/cron-jobs",
  },
  jobs: {
    subdomain,
    path: "/jobs",
  },
  emails: {
    subdomain,
    path: "/emails",
    params: ["userEmail"],
  },
  logs: {
    subdomain,
    path: "/logs",
  },
  metrics: {
    subdomain,
    path: "/metrics",
  },
  events: {
    subdomain,
    path: "/events",
  },
  errors: {
    subdomain,
    path: "/errors",
  },
  audit: {
    subdomain,
    path: "/audit",
  },
  opsTokens: {
    subdomain,
    path: "/ops-tokens",
  },
  opsLogs: {
    subdomain,
    path: "/ops-logs",
  },
  opsIssues: {
    subdomain,
    path: "/ops-issues",
  },
  opsAlerts: {
    subdomain,
    path: "/ops-alerts",
  },
  // BEGIN WORKFLOW AREA page-links FOR vue/add-view
  // END WORKFLOW AREA
};
