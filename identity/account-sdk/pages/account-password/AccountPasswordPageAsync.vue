<template>
  <AsyncPage
    :loader="useAccountPasswordPageLoader"
    :page-component="AccountPasswordPage"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAccountPasswordPageLoader } from "./AccountPasswordPage.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const AccountPasswordPage = defineAsyncComponent(
  () => import("./AccountPasswordPage.vue"),
);
</script>
