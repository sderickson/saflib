<template>
  <AsyncPage
    :loader="useUsersLoader"
    :page-component="Users"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useUsersLoader } from "./Users.loader.ts";
import { users as strings } from "./Users.strings.ts";
import { AsyncPage } from "@saflib/vue/components";
import { useAsyncPageDocumentTitle } from "@saflib/vue";

useAsyncPageDocumentTitle(strings.documentTitle);

const Users = defineAsyncComponent(
  () => import("./Users.vue"),
);
</script>
