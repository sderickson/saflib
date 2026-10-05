<template>
  <v-card
    variant="outlined"
    density="compact"
    :class="['log-entry', `log-entry--${log.channel}`, { 'log-entry--error': log.level === 'error' }]"
  >
    <div class="log-entry__head">
      <span class="log-entry__channel">[{{ log.channel }}]</span>
      <span v-if="label" class="log-entry__label">{{ label }}</span>
      <span v-if="timeLabel" class="log-entry__time">{{ timeLabel }}</span>
    </div>
    <div v-if="isMarkdown" class="log-entry__body log-entry__body--markdown">
      <div v-if="isAgentInput && !expanded" class="log-entry__markdown-preview">
        {{ markdownPreviewText }}
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else v-html="renderedHtml" />
    </div>
    <template v-else>
      <div v-if="previewLines.length" class="log-entry__body">{{ previewText }}</div>
      <div v-if="expanded && remainingLineCount > 0" class="log-entry__body">{{ restText }}</div>
    </template>
    <button v-if="isAgentInput" type="button" class="log-entry__toggle" @click="expanded = !expanded">
      {{ expanded ? "Collapse prompt" : "Show prompt" }}
    </button>
    <button v-else-if="canExpand" type="button" class="log-entry__toggle" @click="expanded = !expanded">
      {{ expanded ? "Show less" : moreLabel }}
    </button>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { marked } from "marked";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";
import { formatLogTime } from "../format-log-time.ts";

const props = defineProps<{ log: WorkflowLogEntry }>();
// Also doubles as "expanded" for the plain-text show-more toggle below —
// `false` means "collapsed" in both cases, so a single flag covers both
// without needing per-channel default wiring.
const expanded = ref(false);

const timeLabel = computed(() => formatLogTime(props.log.created_at));

const PREVIEW_LINE_COUNT = 4;
const MARKDOWN_PREVIEW_CHAR_LIMIT = 100;

// `claude-agent.ts` tags each agent-channel entry with a
// `---------- LABEL ----------\n<body>` header (AGENT / RESULT) — pull
// that out as a small badge instead of showing it as the first,
// content-free line of the preview.
const headerMatch = computed(() => props.log.content.match(/^-{6,} (\S+) -{6,}\n?([\s\S]*)$/));
const label = computed(() => headerMatch.value?.[1]);
const body = computed(() => headerMatch.value?.[2] ?? props.log.content);

// The prompts we send the agent and the natural-language turns it sends
// back are authored/formatted as markdown (headings, lists, code fences,
// bold) — worth rendering as such instead of a monospace text dump.
// `tool`/`terminal` entries are one-line narration or raw command output,
// not prose, so they keep the plain preview/expand behavior below.
const isMarkdown = computed(
  () => props.log.channel === "agent" || props.log.channel === "agent-input",
);
const renderedHtml = computed(() =>
  isMarkdown.value ? (marked.parse(body.value, { async: false }) as string) : "",
);

// Collapsed by default (see `expanded`'s default above) — a large prompt
// (e.g. a workflow step's whole `promptMessage`) otherwise dominates the
// log, especially once it's the one pinned via `position: sticky` at the
// top of the scroll container. `agent` (the model's own replies) is left
// alone: those are usually what you actually want to read, not skip past.
const isAgentInput = computed(() => props.log.channel === "agent-input");
const markdownPreviewText = computed(() => {
  const firstLine = body.value.split("\n").find((l) => l.trim().length > 0) ?? "";
  return firstLine.length > MARKDOWN_PREVIEW_CHAR_LIMIT
    ? `${firstLine.slice(0, MARKDOWN_PREVIEW_CHAR_LIMIT)}…`
    : firstLine;
});

const lines = computed(() => body.value.split("\n"));
const previewLines = computed(() => lines.value.slice(0, PREVIEW_LINE_COUNT));
const previewText = computed(() => previewLines.value.join("\n"));
const restText = computed(() => lines.value.slice(PREVIEW_LINE_COUNT).join("\n"));
const remainingLineCount = computed(() => Math.max(0, lines.value.length - PREVIEW_LINE_COUNT));

const canExpand = computed(() => remainingLineCount.value > 0);
const moreLabel = computed(
  () => `Show ${remainingLineCount.value} more line${remainingLineCount.value === 1 ? "" : "s"}`,
);
</script>

<style scoped>
.log-entry {
  margin: 0.3rem 0;
  padding: 0.4rem 0.65rem;
  font-size: 0.82rem;
  border-left-width: 3px;
  border-left-style: solid;
  border-left-color: transparent;
}
/* A left accent bar per channel — quick to scan for which kind of
   activity a card is, before reading its content. Declared before
   `.log-entry--error` so a failed entry's red always wins over its
   channel's own color when both classes apply. */
.log-entry--agent {
  border-left-color: #2196f3;
}
.log-entry--agent-input {
  border-left-color: #ff9800;
}
.log-entry--terminal {
  border-left-color: #9e9e9e;
}
.log-entry--tool {
  border-left-color: #4caf50;
}
.log-entry--error {
  border-color: rgb(var(--v-theme-error));
}
.log-entry__head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: monospace;
}
.log-entry__channel {
  opacity: 0.6;
}
.log-entry__label {
  font-weight: 600;
  opacity: 0.85;
}
.log-entry__time {
  margin-left: auto;
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
  font-size: 0.78rem;
}
.log-entry__body {
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 0.2rem;
  opacity: 0.85;
  font-family: monospace;
}
.log-entry__body--markdown {
  /* Prose, not a text dump — no monospace, no white-space override; the
     agent's own markdown just uses the page's normal body font. */
  white-space: normal;
  font-family: unset;
}
.log-entry__markdown-preview {
  opacity: 0.6;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-entry__body--markdown :deep(p),
.log-entry__body--markdown :deep(ul),
.log-entry__body--markdown :deep(ol) {
  margin: 0.4em 0;
}
.log-entry__body--markdown :deep(p:first-child) {
  margin-top: 0;
}
.log-entry__body--markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.log-entry__body--markdown :deep(h1),
.log-entry__body--markdown :deep(h2),
.log-entry__body--markdown :deep(h3) {
  margin: 0.6em 0 0.3em;
  font-size: 1em;
}
.log-entry__body--markdown :deep(pre) {
  overflow: auto;
  padding: 0.5rem;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}
.log-entry__body--markdown :deep(code) {
  font-family: monospace;
  font-size: 0.9em;
}
.log-entry__body--markdown :deep(a) {
  color: rgb(var(--v-theme-primary));
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
