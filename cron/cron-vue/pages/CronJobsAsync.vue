<template>
  <AsyncPage :loader="useCronJobsLoader" :page-component="CronJobsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { useCronJobsLoader } from "./CronJobs.loader.ts";
import { cron_jobs as strings } from "./CronJobs.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const CronJobsPage = defineAsyncComponent(
  () => import("./CronJobsPage.vue"),
);
</script>
