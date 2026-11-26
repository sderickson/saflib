<script setup lang="ts">
import { computed } from "vue";
import {
  DynamicAdminLayout,
  type AdminNavGroup,
} from "@saflib/base-clients-common/components";
import { adminLinks } from "@saflib/base-links";
import { configureIdLinks, isDevelopmentDeployment } from "@saflib/vue";
import { adminRepos as repos } from "./repos.ts";
import { sectionMatch } from "./sections.ts";
import { configureUserLinks } from "@saflib/ory-kratos-vue";
import { HealthPill, TrafficChip, useAdminBadges, useRefreshOpsAfterMutations } from "@saflib/ops-vue";

// Counts from the Overview's digest (one cached query).
const badges = useAdminBadges();
// Any change made in the admin refreshes the Overview, badges and top bar.
useRefreshOpsAfterMutations();

// UserRef hover cards and the Users page link to a person's pages.
configureUserLinks({
  user: (id) => `${adminLinks.users.path}?id=${encodeURIComponent(id)}`,
  auditLog: (id) => `${adminLinks.audit.path}?user=${encodeURIComponent(id)}`,
  serverLogs: (id) => `${adminLinks.opsLogs.path}?user=${encodeURIComponent(id)}`,
  jobs: (id) => `${adminLinks.jobs.path}?user=${encodeURIComponent(id)}`,
});

// Request and job ids link to where you'd look next while debugging.
configureIdLinks({
  r: (id) => [
    { label: "Server logs for this request", to: `${adminLinks.opsLogs.path}?id=${encodeURIComponent(id)}` },
    { label: "Jobs from this request", to: `${adminLinks.jobs.path}?request=${encodeURIComponent(id)}` },
  ],
  j: (id) => [
    { label: "Open job", to: `${adminLinks.jobs.path}?job=${encodeURIComponent(id)}` },
    { label: "Server logs for this job", to: `${adminLinks.opsLogs.path}?id=${encodeURIComponent(id)}` },
  ],
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
      {
        ...adminLinks.opsIssues,
        name: "Issues",
        badge: badges.value.newIssues + badges.value.firingAlerts,
        badgeColor: "error",
        match: sectionMatch("issues"),
      },
      { ...adminLinks.opsLogs, name: "Logs", match: sectionMatch("logs") },
      {
        ...adminLinks.jobs,
        name: "Jobs",
        badge: badges.value.tiles["jobs"],
        badgeColor: "error",
        match: sectionMatch("jobs"),
      },
      { ...adminLinks.opsMetrics, name: "Metrics", match: sectionMatch("metrics") },
      { ...adminLinks.statusHealth, name: "Status", match: sectionMatch("status") },
      { ...adminLinks.opsTokens, name: "Admin API" },
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
