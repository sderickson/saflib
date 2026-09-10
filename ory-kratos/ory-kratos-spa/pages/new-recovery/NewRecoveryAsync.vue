<template>
  <AsyncPage :loader="useNewRecoveryLoader" :page-component="NewRecovery" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { AsyncPage } from "@saflib/vue/components";
import { useNewRecoveryLoader } from "./NewRecovery.loader.ts";

const NewRecovery = defineAsyncComponent(() => import("./NewRecovery.vue"));
</script>
