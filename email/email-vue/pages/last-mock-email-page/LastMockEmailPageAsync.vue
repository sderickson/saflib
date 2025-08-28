<template>
  <AsyncPage
    :loader="useLastMockEmailPageLoader"
    :page-component="LastMockEmailPage"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useLastMockEmailPageLoader } from "./LastMockEmailPage.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const LastMockEmailPage = defineAsyncComponent(
  () => import("./LastMockEmailPage.vue"),
);
</script>
