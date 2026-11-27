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
  opsMetrics: {
    subdomain,
    path: "/ops-metrics",
  },
  opsDependencies: {
    subdomain,
    path: "/ops-dependencies",
  },
  diagnostics: {
    subdomain,
    path: "/diagnostics",
  },
  statusHealth: {
    subdomain,
    path: "/status",
  },
  statusBuild: {
    subdomain,
    path: "/status/build",
  },
  opsMetricsProcess: {
    subdomain,
    path: "/ops-metrics/process",
  },
  analytics: {
    subdomain,
    path: "/analytics",
  },
  statusBackups: {
    subdomain,
    path: "/status/backups",
  },
  analyticsTrends: {
    subdomain,
    path: "/analytics/trends",
  },
  // BEGIN WORKFLOW AREA page-links FOR vue/add-view
  // END WORKFLOW AREA
};
