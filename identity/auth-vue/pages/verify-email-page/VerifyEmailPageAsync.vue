<template>
  <AsyncPage :loader="useVerifyEmailPageLoader" :page-component="VerifyEmailPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useVerifyEmailPageLoader } from "./VerifyEmailPage.loader.ts";
import { AsyncPage } from "@saflib/vue-spa";
const VerifyEmailPage = defineAsyncComponent(() => import("./VerifyEmailPage.vue"));
</script>
