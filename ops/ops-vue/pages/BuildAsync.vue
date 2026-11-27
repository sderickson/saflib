<template>
  <BuildPage />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

useAsyncPageDocumentTitle(strings.build);

const BuildPage = defineAsyncComponent(() => import("./BuildPage.vue"));
</script>
