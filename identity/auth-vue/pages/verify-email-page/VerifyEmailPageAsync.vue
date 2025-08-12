<template>
  <AsyncPage
    :loader="() => useVerifyEmailPageLoader(props.redirectTo)"
    :page-component="VerifyEmailPage"
    :page-props="props"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useVerifyEmailPageLoader } from "./VerifyEmailPage.loader.ts";
import { AsyncPage } from "@saflib/vue-spa";

const props = defineProps<{
  redirectTo: string;
}>();

const VerifyEmailPage = defineAsyncComponent(
  () => import("./VerifyEmailPage.vue"),
);
</script>
