<template>
  <AsyncPage
    :loader="useVerifyWallLoader"
    :page-component="VerifyWall"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useVerifyWallLoader } from "./VerifyWall.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const VerifyWall = defineAsyncComponent(
  () => import("./VerifyWall.vue"),
);
</script>
