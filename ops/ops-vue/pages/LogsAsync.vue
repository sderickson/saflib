<template>
  <AsyncPage :loader="asyncLoader" :page-component="LogsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { logsLoaderKey, useLogsLoader } from "./Logs.loader.ts";
import { ops_logs as strings } from "./Logs.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useLogsLoader();
provide(logsLoaderKey, loader);

const asyncLoader = () => ({ logsQuery: loader.logsQuery });

const LogsPage = defineAsyncComponent(() => import("./LogsPage.vue"));
</script>
