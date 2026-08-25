<template>
  <div v-if="isLoading" class="d-flex justify-center my-8">
    <v-progress-circular indeterminate />
  </div>

  <template v-else-if="isError">
    <slot name="error" :error="firstError">
      <component :is="errorComponent" :error="firstError" />
    </slot>
  </template>

  <component :is="props.pageComponent" v-else v-bind="props.pageProps" />
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import type { Component } from "vue";
import type { LoaderQueries } from "../types.ts";
import {
  asyncPageErrorKey,
  type AsyncPageErrorComponent,
} from "../async-page-error.ts";
import AsyncPageError from "./AsyncPageError.vue";

interface Props {
  loader?: () => LoaderQueries;
  pageComponent: Component;
  pageProps?: Record<string, any>;
}

const props = defineProps<Props>();

const errorComponent = inject<AsyncPageErrorComponent>(
  asyncPageErrorKey,
  AsyncPageError,
);

// If pageComponent is an async component, eagerly trigger its loader so the
// code download runs in parallel with data fetching rather than sequentially
// after the loader queries resolve. Track its loading state so the spinner
// stays visible until both data and code are ready.
const isComponentLoading = ref(false);
const asyncLoader = (props.pageComponent as any).__asyncLoader;
if (typeof asyncLoader === "function") {
  isComponentLoading.value = true;
  asyncLoader().finally(() => {
    isComponentLoading.value = false;
  });
}

const queryResults = props.loader?.() ?? {};

const isLoading = computed(
  () =>
    isComponentLoading.value ||
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
</script>
