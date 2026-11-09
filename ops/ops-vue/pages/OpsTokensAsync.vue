<template>
  <component
    v-if="mutationError"
    :is="errorComponent"
    :error="mutationError"
    class="px-4 mb-4"
  />
  <AsyncPage :loader="asyncLoader" :page-component="OpsTokensPage" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageErrorComponent } from "@saflib/vue/composables/useAsyncPageErrorComponent";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { opsTokensLoaderKey, useOpsTokensLoader } from "./OpsTokens.loader.ts";
import { ops_tokens as strings } from "./OpsTokens.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useOpsTokensLoader();
provide(opsTokensLoaderKey, loader);

const asyncLoader = () => ({ tokensQuery: loader.tokensQuery });
const mutationError = computed(
  () => loader.createMutation.error.value ?? loader.revokeMutation.error.value,
);
const errorComponent = useAsyncPageErrorComponent();

const OpsTokensPage = defineAsyncComponent(() => import("./OpsTokensPage.vue"));
</script>
