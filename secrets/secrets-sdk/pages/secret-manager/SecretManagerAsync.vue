<template>
  <AsyncPage :loader="useSecretManagerLoader" :page-component="SecretManager" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useSecretManagerLoader } from "./SecretManager.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const SecretManager = defineAsyncComponent(() => import("./SecretManager.vue"));
</script>
