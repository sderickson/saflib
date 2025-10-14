<template>
  <v-snackbar-queue
    v-model="errors"
    color="error"
    :timeout="5000"
  ></v-snackbar-queue>
  <v-snackbar-queue
    v-model="info"
    color="info"
    :timeout="5000"
  ></v-snackbar-queue>
</template>

<script setup lang="ts">
import { errors, info } from "@saflib/vue";
// TODO: Move this to @saflib/vue
</script>
