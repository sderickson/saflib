<template>
  <component
    v-if="updateMutation.isError.value"
    :is="errorComponent"
    :error="updateMutation.error.value"
    class="px-4 mb-4"
  />
  <AsyncPage :loader="asyncLoader" :page-component="CronJobsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageErrorComponent } from "@saflib/vue/composables/useAsyncPageErrorComponent";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import {
  cronJobsLoaderKey,
  useCronJobsLoader,
} from "./CronJobs.loader.ts";
import { cron_jobs as strings } from "./CronJobs.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useCronJobsLoader();
provide(cronJobsLoaderKey, loader);

const asyncLoader = () => ({ jobsQuery: loader.jobsQuery });
const { updateMutation } = loader;
const errorComponent = useAsyncPageErrorComponent();

const CronJobsPage = defineAsyncComponent(
  () => import("./CronJobsPage.vue"),
);
</script>
