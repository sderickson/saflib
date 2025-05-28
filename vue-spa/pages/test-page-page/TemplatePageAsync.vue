<template>
  <AsyncPage :loader="useTemplatePageLoader" :page-component="TemplatePage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useTemplatePageLoader } from "./TemplatePage.loader.ts";
import { AsyncPage } from "@saflib/vue-spa";
const TemplatePage = defineAsyncComponent(() => import("./TemplatePage.vue"));
</script>
