<template>
  <div v-if="isLoading" class="d-flex justify-center my-8">
    <v-progress-circular indeterminate />
  </div>

  <v-alert v-else-if="isError" type="error" class="my-4">
    {{ errorMessage }}
  </v-alert>

  <component :is="props.pageComponent" v-else />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { Component } from "vue";
import { TanstackError } from "@saflib/vue-spa";

interface Props<TData = unknown, TError = TanstackError> {
  // Loader function that returns an array of vue-query results
  loader: () => UseQueryReturnType<TData, TError>[];
  // The async component definition (e.g., from defineAsyncComponent)
  pageComponent: Component;
}

const props = defineProps<Props>();

const queryResults = props.loader();

const isLoading = computed(() =>
  queryResults.some((query) => query.isLoading.value),
);

const isError = computed(
  () => !isLoading.value && queryResults.some((query) => query.isError.value),
);

const firstError = computed(() => {
  if (!isError.value) {
    return null;
  }
  return queryResults.find((query) => query.isError.value)?.error.value ?? null;
});

const errorMessage = computed(() => {
  const error = firstError.value;

  if (!error) {
    return "An unexpected error occurred.";
  }

  switch (error.status) {
    case 401:
      return "Not Logged In";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 500:
      return "Server Error";
    case 0:
      return "Connection Error";
    default:
      return `Failed to load data (Error ${error.status})`;
  }
});
</script>
