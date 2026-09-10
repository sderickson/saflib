<template>
  <AsyncPage :loader="useRecoveryLoader" :page-component="Recovery" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useRecoveryLoader } from "./Recovery.loader.ts";

const Recovery = defineAsyncComponent(() => import("./Recovery.vue"));
</script>
