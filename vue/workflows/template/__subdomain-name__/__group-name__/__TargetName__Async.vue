<template>
  <AsyncPage
    :loader="use__TargetName__Loader"
    :page-component="__TargetName__"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { use__TargetName__Loader } from "./__TargetName__.loader.ts";
import { __full_name__ as strings } from "./__TargetName__.strings.ts";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";

useAsyncPageDocumentTitle(strings.documentTitle);

const __TargetName__ = defineAsyncComponent(
  () => import("./__TargetName__.vue"),
);
</script>
