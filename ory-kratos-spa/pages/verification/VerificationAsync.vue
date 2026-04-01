<template>
  <AsyncPage :loader="useVerificationLoader" :page-component="Verification" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useVerificationLoader } from "./Verification.loader.ts";

const Verification = defineAsyncComponent(() => import("./Verification.vue"));
</script>
