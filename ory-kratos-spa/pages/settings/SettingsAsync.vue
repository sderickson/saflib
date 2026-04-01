<template>
  <AsyncPage :loader="useSettingsLoader" :page-component="Settings" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useSettingsLoader } from "./Settings.loader.ts";

const Settings = defineAsyncComponent(() => import("./Settings.vue"));
</script>
