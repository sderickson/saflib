<template>
  <div v-if="isLoading" class="d-flex justify-center my-8">
    <v-progress-circular indeterminate />
  </div>

  <template v-else-if="isError">
    <slot name="error" :error="firstError" :error-message="errorMessage">
      <AsyncPageError :error="firstError" :message="errorMessage" />
    </slot>
  </template>

  <component :is="props.pageComponent" v-else v-bind="props.pageProps" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import type { LoaderQueries } from "../types.ts";
import AsyncPageError from "./AsyncPageError.vue";

interface Props {
  loader?: () => LoaderQueries;
  pageComponent: Component;
  pageProps?: Record<string, any>;
}

const props = defineProps<Props>();

// If pageComponent is an async component, eagerly trigger its loader so the
// code download runs in parallel with data fetching rather than sequentially
// after the loader queries resolve.
const asyncLoader = (props.pageComponent as any).__asyncLoader;
if (typeof asyncLoader === "function") {
  asyncLoader();
}

const queryResults = props.loader?.() ?? {};

const isLoading = computed(() =>
  Object.values(queryResults).some((query) => query.isLoading.value),
);

const isError = computed(
  () =>
    !isLoading.value &&
    Object.values(queryResults).some((query) => query.isError.value),
);

const firstError = computed(() => {
  if (!isError.value) {
    return null;
  }
  return (
    Object.values(queryResults).find((query) => query.isError.value)?.error
      .value ?? null
  );
});

const errorMessage = computed(() => {
  const error = firstError.value;

  if (!error) {
    return "An unexpected error occurred.";
  }

  const status = (error as { status?: number })?.status;
  switch (status) {
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
      return `Failed to load data (Error ${status})`;
  }
});
</script>
