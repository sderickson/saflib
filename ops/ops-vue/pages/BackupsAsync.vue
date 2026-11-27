<template>
  <BackupsPage />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { ops_backups as strings } from "./Backups.strings.ts";

useAsyncPageDocumentTitle(strings.page_title);

const BackupsPage = defineAsyncComponent(() => import("./BackupsPage.vue"));
</script>
