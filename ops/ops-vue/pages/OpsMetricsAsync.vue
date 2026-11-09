<template>
  <OpsMetricsPage />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { ops_metrics as strings } from "./OpsMetrics.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

// No data is needed up front: the page queries as the user picks.
const OpsMetricsPage = defineAsyncComponent(() => import("./OpsMetricsPage.vue"));
</script>
