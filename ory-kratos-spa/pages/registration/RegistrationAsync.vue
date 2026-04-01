<template>
  <AsyncPage :loader="useRegistrationLoader" :page-component="Registration" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useRegistrationLoader } from "./Registration.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const Registration = defineAsyncComponent(() => import("./Registration.vue"));
</script>
