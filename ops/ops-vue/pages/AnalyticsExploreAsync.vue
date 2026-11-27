<template>
  <AnalyticsExplorePage />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { ops_analytics as strings } from "./Analytics.strings.ts";

useAsyncPageDocumentTitle(strings.explore_title);

const AnalyticsExplorePage = defineAsyncComponent(() => import("./AnalyticsExplorePage.vue"));
</script>
