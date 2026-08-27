<script setup lang="ts">
import { computed } from "vue";
import { DynamicBaseLayout } from "@saflib/base-clients-common/components";
import { adminLinks } from "@saflib/base-links";
import { isDevelopmentDeployment } from "@saflib/vue";

const adminSidebarLinks = [
  { ...adminLinks.home, name: "Home" },
  { ...adminLinks.users, name: "Users" },
  { ...adminLinks.cronJobs, name: "Cron" },
  { ...adminLinks.jobs, name: "Jobs" },
  { ...adminLinks.errors, name: "Errors" },
  { ...adminLinks.audit, name: "Audit" },
];

const devObservabilitySidebarLinks = computed(() => {
  if (!isDevelopmentDeployment()) {
    return [];
  }
  return [
    { ...adminLinks.emails, name: "Emails" },
    { ...adminLinks.logs, name: "Logs" },
    { ...adminLinks.metrics, name: "Metrics" },
    { ...adminLinks.events, name: "Events" },
  ];
});
</script>

<template>
  <DynamicBaseLayout
    require-auth
    :sidebar-links="adminSidebarLinks"
    :dev-sidebar-links="devObservabilitySidebarLinks"
  >
    <router-view />
  </DynamicBaseLayout>
</template>
