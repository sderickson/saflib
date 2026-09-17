<template>
  <v-card
    variant="outlined"
    density="compact"
    class="tool-call-card"
    :class="{ 'tool-call-card--error': isError }"
  >
    <div class="tool-call-card__head">
      <code class="tool-call-card__command">{{ headline }}</code>
      <span v-if="!resultLog" class="text-caption text-medium-emphasis ml-2">running…</span>
    </div>
    <div v-if="description" class="tool-call-card__description">{{ description }}</div>

    <div v-if="previewLines.length" class="tool-call-card__body">
      {{ expanded ? resultText : previewText }}
    </div>

    <template v-if="expanded && showFullInput">
      <div class="tool-call-card__section-label">Full input</div>
      <div class="tool-call-card__body">{{ fullInputText }}</div>
    </template>

    <button v-if="canExpand" type="button" class="tool-call-card__toggle" @click="expanded = !expanded">
      {{ expanded ? "Show less" : moreLabel }}
    </button>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { parseToolLogPayload } from "@saflib/new-workflows";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";

const props = defineProps<{
  name: string;
  input: unknown;
  resultLog?: WorkflowLogEntry;
}>();

const expanded = ref(false);
const PREVIEW_LINE_COUNT = 4;
const HEADLINE_CHAR_LIMIT = 160;

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const bashCommand = computed(() => {
  const input = props.input as { command?: unknown } | null | undefined;
  return typeof input?.command === "string" ? input.command : undefined;
});

const description = computed(() => {
  const input = props.input as { description?: unknown } | null | undefined;
  return typeof input?.description === "string" ? input.description : undefined;
});

const headline = computed(() => {
  if (bashCommand.value !== undefined) return `$ ${bashCommand.value}`;
  const inputStr = safeJson(props.input);
  const short =
    inputStr.length > HEADLINE_CHAR_LIMIT ? `${inputStr.slice(0, HEADLINE_CHAR_LIMIT)}…` : inputStr;
  return `${props.name}(${short})`;
});

const resultPayload = computed(() => {
  if (!props.resultLog) return undefined;
  const payload = parseToolLogPayload(props.resultLog.content);
  return payload?.kind === "tool_result" ? payload : undefined;
});
const isError = computed(() => resultPayload.value?.is_error ?? false);
const resultText = computed(() => resultPayload.value?.content);

const resultLines = computed(() => (resultText.value ? resultText.value.split("\n") : []));
const previewLines = computed(() => resultLines.value.slice(0, PREVIEW_LINE_COUNT));
const previewText = computed(() => previewLines.value.join("\n"));
const remainingLineCount = computed(() =>
  Math.max(0, resultLines.value.length - PREVIEW_LINE_COUNT),
);

// The command + description already say what's about to run; the raw
// input object is only worth showing on demand (e.g. a non-Bash tool with
// several fields), not as part of the default preview.
const showFullInput = computed(() => bashCommand.value === undefined);
const fullInputText = computed(() => JSON.stringify(props.input, null, 2));

const canExpand = computed(() => remainingLineCount.value > 0 || showFullInput.value);
const moreLabel = computed(() => {
  if (remainingLineCount.value > 0) {
    return `Show ${remainingLineCount.value} more line${remainingLineCount.value === 1 ? "" : "s"}`;
  }
  return "Show details";
});
</script>

<style scoped>
.tool-call-card {
  margin: 0.35rem 0;
  padding: 0.5rem 0.65rem;
  font-family: monospace;
  font-size: 0.82rem;
  border-left-width: 3px;
  border-left-style: solid;
  /* Same left-accent-bar convention as `LogEntry.vue`'s `agent` channel —
     a tool call is always agent-driven. */
  border-left-color: #2196f3;
}
.tool-call-card--error {
  border-color: rgb(var(--v-theme-error));
}
.tool-call-card__head {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}
.tool-call-card__command {
  font-weight: 600;
  white-space: pre-wrap;
  word-break: break-word;
}
.tool-call-card__description {
  opacity: 0.65;
  font-style: italic;
  margin-top: 0.15rem;
}
.tool-call-card__section-label {
  opacity: 0.6;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.tool-call-card__body {
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 0.25rem;
  opacity: 0.85;
}
.tool-call-card__toggle {
  display: block;
  margin-top: 0.4rem;
  background: none;
  border: none;
  padding: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
}
</style>
