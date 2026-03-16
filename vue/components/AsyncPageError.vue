<template>
  <v-alert type="error" class="my-4">
    {{ displayMessage }}
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  error?: unknown;
  message?: string;
}>();

const displayMessage = computed(() => {
  if (props.message) return props.message;
  const error = props.error;
  if (!error) return "An unexpected error occurred.";
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
