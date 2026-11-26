<template>
  <ProcessMetricsPage />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

useAsyncPageDocumentTitle(strings.process_metrics_title);

const ProcessMetricsPage = defineAsyncComponent(() => import("./ProcessMetricsPage.vue"));
</script>
