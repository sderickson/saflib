<template>
  <UsersPage />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useAsyncPageDocumentTitle } from "@saflib/vue";
import { users_page as strings } from "./Users.strings.ts";

useAsyncPageDocumentTitle(strings.documentTitle);

// The list loads on the page itself as the search changes.
const UsersPage = defineAsyncComponent(() => import("./UsersPage.vue"));
</script>
