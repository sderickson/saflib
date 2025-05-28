<template>
  <AsyncPage :loader="useHomePageLoader" :page-component="HomePage" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useHomePageLoader } from "./HomePage.loader.ts";
import { AsyncPage } from "@saflib/vue-spa";
const HomePage = defineAsyncComponent(() => import("./HomePage.vue"));
</script>
