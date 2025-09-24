<template>
  <AsyncPage :loader="useSecretsPageLoader" :page-component="SecretsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useSecretsPageLoader } from "./SecretsPage.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const SecretsPage = defineAsyncComponent(() => import("./SecretsPage.vue"));
</script>
