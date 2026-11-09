<template>
  <AsyncPage :loader="asyncLoader" :page-component="IssuesPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { issuesLoaderKey, useIssuesLoader } from "./Issues.loader.ts";
import { ops_issues as strings } from "./Issues.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useIssuesLoader();
provide(issuesLoaderKey, loader);

const asyncLoader = () => ({ issuesQuery: loader.issuesQuery });

const IssuesPage = defineAsyncComponent(() => import("./IssuesPage.vue"));
</script>
