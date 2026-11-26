<script setup lang="ts">
import { computed } from "vue";
import {
  DynamicAdminLayout,
  type AdminNavGroup,
} from "@saflib/base-clients-common/components";
import { adminLinks } from "@saflib/base-links";
import { isDevelopmentDeployment } from "@saflib/vue";
import { adminRepos as repos } from "./repos.ts";
import { configureUserLinks } from "@saflib/ory-kratos-vue";
import { HealthPill, TrafficChip, useAdminBadges } from "@saflib/ops-vue";

// Counts from the Overview's digest (one cached query).
const badges = useAdminBadges();

// UserRef hover cards and the Users page link to a person's pages.
configureUserLinks({
  user: (id) => `${adminLinks.users.path}?id=${encodeURIComponent(id)}`,
  auditLog: (id) => `${adminLinks.audit.path}?user=${encodeURIComponent(id)}`,
  serverLogs: (id) => `${adminLinks.opsLogs.path}?user=${encodeURIComponent(id)}`,
});

const groups = computed<AdminNavGroup[]>(() => [
  {
    items: [
      {
        ...adminLinks.home,
        name: "Overview",
        badge: badges.value.attention,
        badgeColor: badges.value.attentionBad ? "error" : "warning",
      },
    ],
  },
  {
    label: "Customers",
    items: [{ ...adminLinks.users, name: "Users" }],
  },
  {
    label: "System",
    items: [
      { ...adminLinks.opsIssues, name: "Issues", badge: badges.value.newIssues, badgeColor: "error" },
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
        ]
      : [],
  },
]);
</script>

<template>
  <DynamicAdminLayout :groups="groups" :repos="repos">
    <template #chips>
      <HealthPill :to="adminLinks.home.path" />
      <TrafficChip class="d-none d-md-flex" />
    </template>
    <router-view />
  </DynamicAdminLayout>
</template>
