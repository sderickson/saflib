<template>
  <AsyncPage :loader="useNewVerificationLoader" :page-component="NewVerification" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useNewVerificationLoader } from "./NewVerification.loader.ts";

const NewVerification = defineAsyncComponent(() => import("./NewVerification.vue"));
</script>
