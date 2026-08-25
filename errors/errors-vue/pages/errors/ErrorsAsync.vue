<template>
  <AsyncPage :loader="asyncLoader" :page-component="ErrorsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { errorsLoaderKey, useErrorsLoader } from "./Errors.loader.ts";
import { errors as strings } from "./Errors.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useErrorsLoader();
provide(errorsLoaderKey, loader);

const asyncLoader = () => ({ errorsQuery: loader.errorsQuery });

const ErrorsPage = defineAsyncComponent(() => import("./ErrorsPage.vue"));
</script>
