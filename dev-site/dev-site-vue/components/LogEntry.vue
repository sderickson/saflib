<template>
  <div :class="['log-entry', `log-${log.channel}`, { 'log-error': log.level === 'error' }]">
    <button type="button" class="log-entry__head" @click="expanded = !expanded">
      <v-icon size="14" :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'" />
      <span class="log-channel">[{{ log.channel }}]</span>
      <span v-if="label" class="log-label">{{ label }}</span>
      <span class="log-summary">{{ summary }}</span>
    </button>
    <pre v-if="expanded" class="log-entry__full">{{ body }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";

const props = defineProps<{ log: WorkflowLogEntry }>();
const expanded = ref(false);

const SUMMARY_LIMIT = 140;

// `claude-agent.ts` tags each agent-channel entry with a
// `---------- LABEL ----------\n<body>` header (AGENT / TOOL / RESULT) —
// pull that out as a small badge instead of showing it as the first,
// content-free line of the summary.
const headerMatch = computed(() => props.log.content.match(/^-{6,} (\S+) -{6,}\n?([\s\S]*)$/));
const label = computed(() => headerMatch.value?.[1]);
const body = computed(() => headerMatch.value?.[2] ?? props.log.content);

const summary = computed(() => {
  const firstLine = body.value.split("\n").find((line) => line.trim().length > 0) ?? "";
  const hasMore = body.value.trimEnd().includes("\n") || firstLine.length > SUMMARY_LIMIT;
  const truncated =
    firstLine.length > SUMMARY_LIMIT ? `${firstLine.slice(0, SUMMARY_LIMIT)}…` : firstLine;
  return hasMore && !truncated.endsWith("…") ? `${truncated} …` : truncated;
});
</script>

<style scoped>
.log-entry {
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
}
.log-entry__head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.15rem 0;
  background: none;
  border: none;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.log-entry__head:hover {
  background: rgba(128, 128, 128, 0.08);
}
.log-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
  min-width: 0;
}
.log-label {
  opacity: 0.8;
  font-weight: 600;
}
.log-entry__full {
  margin: 0 0 0.35rem 1.35rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.log-channel {
  opacity: 0.6;
  flex: 0 0 auto;
}
.log-tool {
  color: #4caf50;
}
.log-agent {
  color: #2196f3;
}
.log-agent-input {
  color: #ff9800;
}
.log-terminal {
  opacity: 0.7;
}
.log-error {
  color: #f44336;
  font-weight: 600;
}
</style>
