<template>
  <v-card
    variant="outlined"
    density="compact"
    class="tool-call-card"
    :class="{ 'tool-call-card--error': isError }"
  >
    <div class="tool-call-card__head">
      <span class="tool-call-card__title">{{ invocation.title }}</span>
      <span v-if="!resultLog" class="tool-call-card__status text-caption text-medium-emphasis">
        running…
      </span>
    </div>
    <code v-if="invocation.detail" class="tool-call-card__detail">{{ invocation.detail }}</code>
    <div v-if="description" class="tool-call-card__description">{{ description }}</div>

    <template v-if="showFullInput">
      <div class="tool-call-card__section-label">Input</div>
      <pre class="tool-call-card__pre">{{ fullInputText }}</pre>
    </template>

    <template v-if="resultText">
      <div class="tool-call-card__section-label">Output</div>
      <ToolResultBody :content="resultText" :is-error="isError" />
    </template>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  parseToolLogPayload,
  type WorkflowLogEntry,
} from "@saflib/new-workflows-spec";
import { formatToolInvocation } from "../tool-display.ts";
import ToolResultBody from "./ToolResultBody.vue";

const props = defineProps<{
  name: string;
  input: unknown;
  resultLog?: WorkflowLogEntry;
}>();

const invocation = computed(() => formatToolInvocation(props.name, props.input));

const description = computed(() => {
  const input = props.input as { description?: unknown } | null | undefined;
  return typeof input?.description === "string" ? input.description : undefined;
});

const resultPayload = computed(() => {
  if (!props.resultLog) return undefined;
  const payload = parseToolLogPayload(props.resultLog.content);
  return payload?.kind === "tool_result" ? payload : undefined;
});
const isError = computed(() => resultPayload.value?.is_error ?? false);
const resultText = computed(() => resultPayload.value?.content);

const showFullInput = computed(
  () => !invocation.value.inputIsRedundant && !invocation.value.detail && props.input !== undefined,
);
const fullInputText = computed(() => JSON.stringify(props.input, null, 2));
</script>

<style scoped>
.tool-call-card {
  margin: 0.35rem 0;
  padding: 0.55rem 0.7rem;
  font-size: 0.82rem;
  border-left-width: 3px;
  border-left-style: solid;
  border-left-color: #2196f3;
}
.tool-call-card--error {
  border-left-color: rgb(var(--v-theme-error));
}
.tool-call-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}
.tool-call-card__title {
  font-weight: 600;
  font-family: ui-monospace, monospace;
}
.tool-call-card__detail {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
  opacity: 0.9;
}
.tool-call-card__description {
  opacity: 0.65;
  font-style: italic;
  margin-top: 0.15rem;
}
.tool-call-card__section-label {
  opacity: 0.55;
  margin-top: 0.55rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tool-call-card__pre {
  margin: 0.2rem 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  opacity: 0.85;
}
</style>
