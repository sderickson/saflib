<template>
  <AsyncPage :loader="asyncLoader" :page-component="AlertsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { alertsLoaderKey, useAlertsLoader } from "./Alerts.loader.ts";
import { ops_alerts as strings } from "./Alerts.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useAlertsLoader();
provide(alertsLoaderKey, loader);

const asyncLoader = () => ({ alertsQuery: loader.alertsQuery });

const AlertsPage = defineAsyncComponent(() => import("./AlertsPage.vue"));
</script>
