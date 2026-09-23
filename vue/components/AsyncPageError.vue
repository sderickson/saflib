<template>
  <v-alert type="error" class="my-4">
    <div>{{ description.message }}</div>
    <v-btn
      v-if="description.action"
      class="mt-3"
      variant="outlined"
      :href="description.action.href"
    >
      {{ description.action.label }}
    </v-btn>
  </v-alert>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { mfaRequiredHrefKey } from "../async-page-error.ts";
import { describeAsyncPageError } from "../src/async-page-error-message.ts";

const props = defineProps<{
  error?: unknown;
  message?: string;
}>();

const mfaRequiredHref = inject(mfaRequiredHrefKey, undefined);

const description = computed(() =>
  describeAsyncPageError(props.error, {
    message: props.message,
    mfaRequiredHref,
  }),
);
</script>
