<template>
  <v-snackbar-queue
    location="top"
    closable
    v-model="errors"
    color="error"
    :timeout="5000"
  >
    <template #actions="{ item, props }">
      <v-btn
        v-if="snackbarAction(item)"
        variant="text"
        :href="snackbarAction(item)!.href"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >
        {{ snackbarAction(item)!.label }}
      </v-btn>
      <v-btn variant="text" @click="props.onClick">Dismiss</v-btn>
    </template>
  </v-snackbar-queue>
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
import {
  errors,
  info,
  type ErrorSnackbarAction,
  type ErrorSnackbarQueueItem,
} from "@saflib/vue";

function snackbarAction(
  item: ErrorSnackbarQueueItem,
): ErrorSnackbarAction | undefined {
  return typeof item === "string" ? undefined : item.action;
}
</script>
