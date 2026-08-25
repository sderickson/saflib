<script setup lang="ts">
import { DynamicBaseLayout } from "@saflib/base-clients-common/components";
import { adminLinks } from "@saflib/base-links";

const adminSidebarLinks = [
  { ...adminLinks.home, name: "Home" },
  { ...adminLinks.users, name: "Users" },
  { ...adminLinks.cronJobs, name: "Cron" },
  { ...adminLinks.jobs, name: "Jobs" },
  { ...adminLinks.emails, name: "Emails" },
  { ...adminLinks.logs, name: "Logs" },
  { ...adminLinks.metrics, name: "Metrics" },
  { ...adminLinks.events, name: "Events" },
  { ...adminLinks.errors, name: "Errors" },
  { ...adminLinks.audit, name: "Audit" },
  { ...adminLinks.testUtils, name: "Test utils" },
];
</script>

<template>
  <DynamicBaseLayout require-auth :sidebar-links="adminSidebarLinks">
    <router-view />
  </DynamicBaseLayout>
</template>
