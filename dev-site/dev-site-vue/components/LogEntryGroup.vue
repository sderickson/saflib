<template>
  <v-card
    variant="outlined"
    density="compact"
    :class="['log-entry', `log-entry--${channel}`, { 'log-entry--error': hasError }]"
  >
    <div class="log-entry__head">
      <span class="log-entry__channel">[{{ channel }}]</span>
    </div>
    <div
      v-for="log in previewLogs"
      :key="log.id"
      class="log-entry__body log-entry-group__line"
      :class="{ 'log-entry--error': log.level === 'error' }"
    >
      {{ log.content }}
    </div>
    <template v-if="expanded">
      <div
        v-for="log in restLogs"
        :key="log.id"
        class="log-entry__body log-entry-group__line"
        :class="{ 'log-entry--error': log.level === 'error' }"
      >
        {{ log.content }}
      </div>
    </template>
    <button v-if="canExpand" type="button" class="log-entry__toggle" @click="expanded = !expanded">
      {{ expanded ? "Show less" : moreLabel }}
    </button>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";

const props = defineProps<{ logs: WorkflowLogEntry[] }>();
const expanded = ref(false);

// Same threshold as `LogEntry`'s per-entry line preview — here it's a
// count of whole log lines (usually one-liners like "Running command:
// …") rather than text lines within one entry.
const PREVIEW_LOG_COUNT = 4;

const channel = computed(() => props.logs[0]?.channel);
const hasError = computed(() => props.logs.some((log) => log.level === "error"));
const previewLogs = computed(() => props.logs.slice(0, PREVIEW_LOG_COUNT));
const restLogs = computed(() => props.logs.slice(PREVIEW_LOG_COUNT));
const canExpand = computed(() => restLogs.value.length > 0);
const moreLabel = computed(
  () => `Show ${restLogs.value.length} more line${restLogs.value.length === 1 ? "" : "s"}`,
);
</script>

<style scoped>
.log-entry {
  margin: 0.3rem 0;
  padding: 0.4rem 0.65rem;
  font-family: monospace;
  font-size: 0.82rem;
}
.log-entry--error {
  border-color: rgb(var(--v-theme-error));
}
.log-entry__head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.log-entry__channel {
  opacity: 0.6;
}
.log-entry__body {
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 0.2rem;
  opacity: 0.85;
}
.log-entry-group__line + .log-entry-group__line {
  margin-top: 0.15rem;
}
.log-entry__toggle {
  display: block;
  margin-top: 0.3rem;
  background: none;
  border: none;
  padding: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
}
.log-entry--agent .log-entry__channel {
  color: #2196f3;
}
.log-entry--agent-input .log-entry__channel {
  color: #ff9800;
}
.log-entry--terminal .log-entry__channel {
  opacity: 0.5;
}
.log-entry--tool .log-entry__channel {
  color: #4caf50;
}
</style>
