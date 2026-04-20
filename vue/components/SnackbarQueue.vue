<template>
  <v-snackbar-queue
    location="top"
    closable
    v-model="errors"
    color="error"
    :timeout="5000"
  ></v-snackbar-queue>
  <v-snackbar-queue
    location="top"
    v-model="info"
    color="white"
    prepend-icon="$success"
    :timeout="5000"
    closable
  ></v-snackbar-queue>
</template>

<script setup lang="ts">
import { errors, info } from "@saflib/vue";
</script>
