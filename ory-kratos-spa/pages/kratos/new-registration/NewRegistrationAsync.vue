<template>
  <AsyncPage
    :loader="useNewRegistrationLoader"
    :page-component="NewRegistration"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useNewRegistrationLoader } from "./NewRegistration.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const NewRegistration = defineAsyncComponent(
  () => import("./NewRegistration.vue"),
);
</script>
