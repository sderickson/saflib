<template>
  <span v-if="fields" class="log-fields">
    <button
      type="button"
      class="log-fields__toggle"
      :aria-expanded="open"
      data-test="log-fields-toggle"
      @click.stop="open = !open"
    >
      {{ open ? "▾" : "▸" }} {{ fieldKeysSummary(fields) }}
    </button>
    <!-- Untrusted text: plain interpolation only (escaped), never v-html. -->
    <pre v-if="open" class="log-fields__json" data-test="log-fields-json">{{ JSON.stringify(fields, null, 2) }}</pre>
  </span>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { fieldKeysSummary } from "./log-format.ts";

defineProps<{ fields: Record<string, unknown> | null | undefined }>();
const open = ref(false);
</script>

<style scoped>
.log-fields__toggle {
  padding: 0;
  border: 0;
  background: none;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.log-fields__json {
  margin: 4px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.75rem;
}
</style>
