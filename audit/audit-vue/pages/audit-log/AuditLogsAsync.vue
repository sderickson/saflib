<template>
  <AsyncPage
    :loader="asyncLoader"
    :page-component="AuditLogPage"
    :page-props="pageProps"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { auditLogsLoaderKey, useAuditLogsLoader } from "./AuditLog.loader.ts";
import { audit_log as strings } from "./AuditLog.strings.ts";

const props = withDefaults(
  defineProps<{
    description?: string;
    sealEnabled?: boolean;
  }>(),
  {
    sealEnabled: false,
  },
);

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useAuditLogsLoader();
provide(auditLogsLoaderKey, loader);

const asyncLoader = () => ({ auditLogsQuery: loader.auditLogsQuery });

const pageProps = computed(() => ({
  description: props.description,
  sealEnabled: props.sealEnabled,
}));

const AuditLogPage = defineAsyncComponent(() => import("./AuditLogPage.vue"));
</script>
