<template>
  <AsyncPage
    :loader="() => useVerifyWallPageLoader(props.redirectTo)"
    :page-component="VerifyWallPage"
    :page-props="props"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useVerifyWallPageLoader } from "./VerifyWallPage.loader.ts";
import { AsyncPage } from "@saflib/vue-spa";

const props = defineProps<{
  redirectTo: string;
}>();

const VerifyWallPage = defineAsyncComponent(
  () => import("./VerifyWallPage.vue"),
);
</script>
