<template>
  <HealthPage />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

useAsyncPageDocumentTitle(strings.health_page_title);

const HealthPage = defineAsyncComponent(() => import("./HealthPage.vue"));
</script>
