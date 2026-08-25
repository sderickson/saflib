<template>
  <AsyncPage :loader="asyncLoader" :page-component="JobsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { jobsLoaderKey, useJobsLoader } from "./Jobs.loader.ts";
import { jobs as strings } from "./Jobs.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useJobsLoader();
provide(jobsLoaderKey, loader);

const asyncLoader = () => ({ jobsQuery: loader.jobsQuery });

const JobsPage = defineAsyncComponent(() => import("./JobsPage.vue"));
</script>
