<template>
  <div v-if="isLoading" class="d-flex justify-center my-8">
    <v-progress-circular indeterminate />
  </div>

  <v-alert v-else-if="isError" type="error" class="my-4">
    {{ errorMessage }}
  </v-alert>

  <component :is="props.pageComponent" v-else v-bind="props.pageProps" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import type { LoaderQueries } from "../types.ts";

interface Props {
  loader?: () => LoaderQueries;
  pageComponent: Component;
  pageProps?: Record<string, any>;
}

const props = defineProps<Props>();

const queryResults = props.loader?.() ?? {};

const isLoading = computed(() =>
  Array.isArray(queryResults)
    ? queryResults.some((query) => query.isLoading.value)
    : Object.values(queryResults).some((query) => query.isLoading.value),
);

const isError = computed(
  () =>
    !isLoading.value &&
    (Array.isArray(queryResults)
      ? queryResults.some((query) => query.isError.value)
      : Object.values(queryResults).some((query) => query.isError.value)),
);

const firstError = computed(() => {
  if (!isError.value) {
    return null;
  }
  return Array.isArray(queryResults)
    ? (queryResults.find((query) => query.isError.value)?.error.value ?? null)
    : (Object.values(queryResults).find((query) => query.isError.value)?.error
        .value ?? null);
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
