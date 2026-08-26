<template>
  <AsyncPage :loader="asyncLoader" :page-component="SentEmailsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import {
  sentEmailsLoaderKey,
  useSentEmailsLoader,
} from "./SentEmails.loader.ts";
import { sent_emails as strings } from "./SentEmails.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useSentEmailsLoader();
provide(sentEmailsLoaderKey, loader);

const asyncLoader = () => ({ sentEmailsQuery: loader.sentEmailsQuery });

const SentEmailsPage = defineAsyncComponent(() => import("./SentEmailsPage.vue"));
</script>
