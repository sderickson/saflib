<template>
  <AsyncPage :loader="useTemplateFileLoader" :page-component="TemplateFile" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useTemplateFileLoader } from "./TemplateFile.loader.ts";
import { AsyncPage } from "@saflib/vue-spa";
const TemplateFile = defineAsyncComponent(() => import("./TemplateFile.vue"));
</script>
