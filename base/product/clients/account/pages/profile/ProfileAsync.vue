<template>
  <AsyncPage :loader="useProfileLoader" :page-component="Profile" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useProfileLoader } from "./Profile.loader.ts";
import { profile as strings } from "./Profile.strings.ts";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";

useAsyncPageDocumentTitle(strings.documentTitle);

const Profile = defineAsyncComponent(() => import("./Profile.vue"));
</script>
