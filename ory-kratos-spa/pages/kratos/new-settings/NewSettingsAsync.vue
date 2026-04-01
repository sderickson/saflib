<template>
  <AsyncPage :loader="useNewSettingsLoader" :page-component="NewSettings" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useNewSettingsLoader } from "./NewSettings.loader.ts";

const NewSettings = defineAsyncComponent(() => import("./NewSettings.vue"));
</script>
