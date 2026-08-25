import type { LinkMap } from "@saflib/links";

const subdomain = "admin";

export const adminLinks: LinkMap = {
  // BEGIN WORKFLOW AREA page-links FOR vue/add-view
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
  testUtils: {
    subdomain,
    path: "/test-utils",
  },
  // END WORKFLOW AREA
};
