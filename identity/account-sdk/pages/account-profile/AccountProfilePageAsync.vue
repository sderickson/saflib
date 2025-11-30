<template>
  <AsyncPage
    :loader="useAccountProfilePageLoader"
    :page-component="AccountProfilePage"
    :page-props="props"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAccountProfilePageLoader } from "./AccountProfilePage.loader.ts";
import { AsyncPage } from "@saflib/vue/components";

const props = defineProps<{
  redirectTo?: string;
}>();

const AccountProfilePage = defineAsyncComponent(
  () => import("./AccountProfilePage.vue"),
);
</script>
