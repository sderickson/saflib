<template>
  <AsyncPage
    :loader="useHomeLoader"
    :page-component="Home"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useHomeLoader } from "./Home.loader.ts";
import { home as strings } from "./Home.strings.ts";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";

useAsyncPageDocumentTitle(strings.documentTitle);

const Home = defineAsyncComponent(
  () => import("./Home.vue"),
);
</script>
