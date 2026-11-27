<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-4">{{ strings.process_metrics_title }}</AdminPageTitle>
    <MetricsCard />
  </ContentWidth>
</template>

<script setup lang="ts">
import { AdminPageTitle, ContentWidth } from "@saflib/vue/components";
import MetricsCard from "./MetricsCard.vue";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";
</script>
