<template>
  <AsyncPage :loader="asyncLoader" :page-component="ProductEventsPage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import {
  productEventsLoaderKey,
  useProductEventsLoader,
} from "./ProductEvents.loader.ts";
import { product_events as strings } from "./ProductEvents.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

const loader = useProductEventsLoader();
provide(productEventsLoaderKey, loader);

const asyncLoader = () => ({ productEventsQuery: loader.productEventsQuery });

const ProductEventsPage = defineAsyncComponent(
  () => import("./ProductEventsPage.vue"),
);
</script>
