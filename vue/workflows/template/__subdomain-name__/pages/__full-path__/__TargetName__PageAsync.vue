<template>
  <AsyncPage
    :loader="use__TargetName__Loader"
    :page-component="__TargetName__"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { use__TargetName__Loader } from "./__TargetName__Page.loader.ts";
import { AsyncPage } from "@saflib/vue/components";
const __TargetName__ = defineAsyncComponent(
  () => import("./__TargetName__Page.vue"),
);
</script>
