<template>
  <AsyncPage :loader="useLoginLoader" :page-component="Login" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useLoginLoader } from "./Login.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const Login = defineAsyncComponent(() => import("./Login.vue"));
</script>
