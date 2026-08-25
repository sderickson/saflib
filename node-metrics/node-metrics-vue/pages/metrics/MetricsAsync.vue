<template>
  <AsyncPage :loader="asyncLoader" :page-component="MetricsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { metricsLoaderKey, useMetricsLoader } from "./Metrics.loader.ts";
import { metrics as strings } from "./Metrics.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useMetricsLoader();
provide(metricsLoaderKey, loader);

const asyncLoader = () => ({ metricsQuery: loader.metricsQuery });

const MetricsPage = defineAsyncComponent(() => import("./MetricsPage.vue"));
</script>
