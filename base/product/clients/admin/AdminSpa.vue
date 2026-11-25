<script setup lang="ts">
import { computed } from "vue";
import {
  DynamicAdminLayout,
  type AdminNavGroup,
} from "@saflib/base-clients-common/components";
import { adminLinks } from "@saflib/base-links";
import { isDevelopmentDeployment } from "@saflib/vue";
import type { BuildRepoUrls } from "@saflib/ops-vue";
import { configureUserLinks } from "@saflib/ory-kratos-vue";

// UserRef hover cards link to the person's page.
configureUserLinks({
  user: (id) => `${adminLinks.users.path}?id=${encodeURIComponent(id)}`,
});

/** Where this product's commits live, for the build chip's links. */
const repos: BuildRepoUrls = {
  // root: "https://github.com/<org>/<repo>",
};

const groups = computed<AdminNavGroup[]>(() => [
  { items: [{ ...adminLinks.home, name: "Overview" }] },
  {
    label: "Customers",
    items: [{ ...adminLinks.users, name: "Users" }],
  },
  {
    label: "System",
    items: [
      { ...adminLinks.opsIssues, name: "Issues" },
      { ...adminLinks.opsAlerts, name: "Alerts" },
      { ...adminLinks.opsLogs, name: "Server logs" },
      { ...adminLinks.opsMetrics, name: "Metrics" },
      { ...adminLinks.jobs, name: "Background jobs" },
      { ...adminLinks.cronJobs, name: "Cron jobs" },
      { ...adminLinks.opsDependencies, name: "Dependencies" },
      { ...adminLinks.audit, name: "Audit log" },
      { ...adminLinks.opsTokens, name: "Ops tokens" },
      { ...adminLinks.diagnostics, name: "Diagnostics" },
    ],
  },
  {
    label: "Dev",
    tag: "local only",
    items: isDevelopmentDeployment()
      ? [
          { ...adminLinks.emails, name: "Emails" },
          { ...adminLinks.logs, name: "Live server logs" },
        ]
      : [],
  },
]);
</script>

<template>
  <DynamicAdminLayout :groups="groups" :repos="repos">
    <router-view />
  </DynamicAdminLayout>
</template>
