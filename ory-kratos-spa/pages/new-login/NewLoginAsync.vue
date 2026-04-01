<template>
  <AsyncPage :loader="useNewLoginLoader" :page-component="NewLogin" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useNewLoginLoader } from "./NewLogin.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const NewLogin = defineAsyncComponent(() => import("./NewLogin.vue"));
</script>
