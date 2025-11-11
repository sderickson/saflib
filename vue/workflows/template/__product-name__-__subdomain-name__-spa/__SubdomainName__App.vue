<script setup lang="ts">
import { SnackbarQueue } from "@saflib/vue/components";
</script>

<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
    <SnackbarQueue />
  </v-app>
</template>

<style scoped></style>
