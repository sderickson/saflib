<template>
  <MarketingUnsubscribe />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { marketing_unsubscribe as strings } from "./MarketingUnsubscribe.strings.ts";
import { useAsyncPageDocumentTitle } from "@saflib/vue";

useAsyncPageDocumentTitle(strings.documentTitle);

const MarketingUnsubscribe = defineAsyncComponent(
  () => import("./MarketingUnsubscribe.vue"),
);
</script>
