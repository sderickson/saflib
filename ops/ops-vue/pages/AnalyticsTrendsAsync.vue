<template>
  <AnalyticsTrendsPage />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { ops_analytics as strings } from "./Analytics.strings.ts";

useAsyncPageDocumentTitle(strings.trends_title);

const AnalyticsTrendsPage = defineAsyncComponent(() => import("./AnalyticsTrendsPage.vue"));
</script>
