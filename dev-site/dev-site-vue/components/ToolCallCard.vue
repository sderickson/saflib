<template>
  <v-card
    variant="outlined"
    density="compact"
    class="tool-call-card"
    :class="{ 'tool-call-card--error': isError }"
  >
    <div class="tool-call-card__head">
      <span class="tool-call-card__title">{{ invocation.title }}</span>
      <span class="tool-call-card__status">
        <span v-if="!resultLog" class="text-caption text-medium-emphasis">running…</span>
        <span v-if="timeLabel" class="tool-call-card__time">{{ timeLabel }}</span>
      </span>
    </div>
    <code
      v-if="invocation.detail"
      class="tool-call-card__detail"
      :class="{ 'tool-call-card__detail--clamped': detailClamped }"
    >{{ detailText }}</code>
    <button
      v-if="detailIsLong"
      type="button"
      class="tool-call-card__toggle"
      @click="detailExpanded = !detailExpanded"
    >
      {{ detailExpanded ? "Show less" : detailMoreLabel }}
    </button>
    <div v-if="description" class="tool-call-card__description">{{ description }}</div>

    <template v-if="showFullInput">
      <div class="tool-call-card__section-label">Input</div>
      <pre class="tool-call-card__pre">{{ fullInputText }}</pre>
    </template>

    <template v-if="resultText">
      <div class="tool-call-card__section-label">Output</div>
      <ToolResultBody :content="resultText" :is-error="isError" :preview-lines="5" />
    </template>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  parseToolLogPayload,
  type WorkflowLogEntry,
} from "@saflib/new-workflows-spec";
import { formatToolInvocation } from "../tool-display.ts";
import { formatLogTime } from "../format-log-time.ts";
import ToolResultBody from "./ToolResultBody.vue";

const props = defineProps<{
  name: string;
  input: unknown;
  resultLog?: WorkflowLogEntry;
  /** The `tool_use` row's `created_at` — when the call started. */
  startedAt?: string;
}>();

const timeLabel = computed(() => (props.startedAt ? formatLogTime(props.startedAt) : ""));

const invocation = computed(() => formatToolInvocation(props.name, props.input));

/**
 * Collapsed, a long command (a heredoc script, say) shows its first few
 * lines; with the output's own short preview the card stays around ten
 * lines. The CSS clamp also catches one very long line that wraps.
 */
const DETAIL_PREVIEW_LINES = 3;
const DETAIL_PREVIEW_CHARS = 240;
const detailExpanded = ref(false);
const detailLines = computed(() => (invocation.value.detail ?? "").split("\n"));
const detailIsLong = computed(
  () =>
    detailLines.value.length > DETAIL_PREVIEW_LINES ||
    (invocation.value.detail ?? "").length > DETAIL_PREVIEW_CHARS,
);
const detailClamped = computed(() => detailIsLong.value && !detailExpanded.value);
const detailText = computed(() =>
  detailClamped.value && detailLines.value.length > DETAIL_PREVIEW_LINES
    ? `${detailLines.value.slice(0, DETAIL_PREVIEW_LINES).join("\n")}\n…`
    : (invocation.value.detail ?? ""),
);
const detailMoreLabel = computed(() => {
  const hidden = detailLines.value.length - DETAIL_PREVIEW_LINES;
  return hidden > 0 ? `Show ${hidden} more line${hidden === 1 ? "" : "s"}` : "Show all";
});

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
.tool-call-card__status {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-shrink: 0;
}
.tool-call-card__time {
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
  font-size: 0.78rem;
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
.tool-call-card__detail--clamped {
  /* The ellipsis line plus the preview lines; also stops a single long
     line from wrapping on and on. */
  max-height: calc((3 + 1) * 1lh);
  overflow: hidden;
}
/* Same look as the log entries' own show-more toggle. */
.tool-call-card__toggle {
  display: block;
  margin-top: 0.2rem;
  background: none;
  border: none;
  padding: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  cursor: pointer;
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
