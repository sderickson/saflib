<template>
  <AsyncPage
    :loader="useAccountProfilePageLoader"
    :page-component="AccountProfilePage"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAccountProfilePageLoader } from "./AccountProfilePage.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const AccountProfilePage = defineAsyncComponent(
  () => import("./AccountProfilePage.vue"),
);
</script>
