<template>
  <AsyncPage :loader="asyncLoader" :page-component="DependenciesPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { dependenciesLoaderKey, useDependenciesLoader } from "./Dependencies.loader.ts";
import { ops_dependencies as strings } from "./Dependencies.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useDependenciesLoader();
provide(dependenciesLoaderKey, loader);

const asyncLoader = () => ({ dependenciesQuery: loader.dependenciesQuery });

const DependenciesPage = defineAsyncComponent(() => import("./DependenciesPage.vue"));
</script>
