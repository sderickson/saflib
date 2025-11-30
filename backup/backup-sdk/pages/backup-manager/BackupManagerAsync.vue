<template>
  <AsyncPage
    :loader="useBackupManagerLoader"
    :page-component="BackupManager"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useBackupManagerLoader } from "./BackupManager.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const BackupManager = defineAsyncComponent(
  () => import("./BackupManager.vue"),
);
</script>
