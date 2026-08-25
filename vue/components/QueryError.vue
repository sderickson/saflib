<template>
  <component :is="errorComponent" :error="error" :message="message" />
</template>

<script setup lang="ts">
import { inject } from "vue";
import {
  asyncPageErrorKey,
  type AsyncPageErrorComponent,
} from "../async-page-error.ts";
import AsyncPageError from "./AsyncPageError.vue";

defineProps<{
  error?: unknown;
  message?: string;
}>();

const errorComponent = inject<AsyncPageErrorComponent>(
  asyncPageErrorKey,
  AsyncPageError,
);
</script>
