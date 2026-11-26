<template>
  <OpsOverview :links="links" :repos="repos" />
</template>

<script setup lang="ts">
import { adminLinks } from "@saflib/base-links";
import { OpsOverview } from "@saflib/ops-vue";
import { useHomeLoader } from "./Home.loader.ts";
import { adminRepos as repos } from "../../repos.ts";

useHomeLoader();

/** Where each Overview tile and attention item leads. Add the product's own tiles here. */
const links = {
  health: adminLinks.diagnostics.path,
  issues: adminLinks.opsIssues.path,
  alerts: adminLinks.opsAlerts.path,
  heartbeat: adminLinks.opsAlerts.path,
  logs: `${adminLinks.opsLogs.path}?level=warn`,
  metrics: adminLinks.opsMetrics.path,
  dependencies: adminLinks.opsDependencies.path,
  jobs: `${adminLinks.jobs.path}?status=dead`,
  cron: adminLinks.cronJobs.path,
  audit: adminLinks.audit.path,
  diagnostics: adminLinks.diagnostics.path,
};
</script>
