<template>
  <DiagnosticsPage />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const DiagnosticsPage = defineAsyncComponent(() => import("./DiagnosticsPage.vue"));
</script>
