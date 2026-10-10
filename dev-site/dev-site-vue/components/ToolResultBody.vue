<template>
  <div class="tool-result-body">
    <template v-if="sections">
      <div v-for="(section, i) in visibleSections" :key="i" class="tool-result-body__section">
        <div class="tool-result-body__section-label">{{ section.label }}</div>
        <pre class="tool-result-body__pre">{{ section.body }}</pre>
      </div>
    </template>
    <pre v-else class="tool-result-body__pre">{{ preview }}</pre>
    <button
      v-if="canExpand"
      type="button"
      class="tool-result-body__toggle"
      @click="expanded = !expanded"
    >
      {{ expanded ? "Show less" : expandLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  previewToolResultText,
  splitToolResultSections,
  toolResultLineCount,
} from "../tool-display.ts";

const props = defineProps<{
  content: string;
  isError?: boolean;
}>();

const expanded = ref(false);
const PREVIEW_LINES = 8;

const sections = computed(() => splitToolResultSections(props.content));

const visibleSections = computed(() => {
  if (!sections.value) return [];
  if (expanded.value) return sections.value;
  const first = sections.value[0]!;
  const lines = first.body.split("\n");
  if (lines.length <= PREVIEW_LINES && sections.value.length === 1) {
    return sections.value;
  }
  return [
    {
      label: first.label,
      body:
        lines.length > PREVIEW_LINES
          ? `${lines.slice(0, PREVIEW_LINES).join("\n")}\n…`
          : first.body,
    },
    ...(sections.value.length > 1 && !expanded.value
      ? [{ label: "…", body: `${sections.value.length - 1} more section(s)` }]
      : []),
  ];
});

const preview = computed(() =>
  expanded.value ? props.content : previewToolResultText(props.content, PREVIEW_LINES),
);

const canExpand = computed(() => {
  if (sections.value) {
    return (
      sections.value.length > 1 ||
      (sections.value[0]?.body.split("\n").length ?? 0) > PREVIEW_LINES
    );
  }
  return toolResultLineCount(props.content) > PREVIEW_LINES;
});

const expandLabel = computed(() => {
  if (sections.value && sections.value.length > 1) {
    return `Show all ${sections.value.length} sections`;
  }
  const remaining = toolResultLineCount(props.content) - PREVIEW_LINES;
  return `Show ${remaining} more line${remaining === 1 ? "" : "s"}`;
});
</script>

<style scoped>
.tool-result-body__section {
  margin-top: 0.35rem;
}
.tool-result-body__section-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.55;
  margin-bottom: 0.15rem;
}
.tool-result-body__pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  line-height: 1.35;
  opacity: 0.9;
}
.tool-result-body--error .tool-result-body__pre {
  color: rgb(var(--v-theme-error));
}
.tool-result-body__toggle {
  display: block;
  margin-top: 0.35rem;
  background: none;
  border: none;
  padding: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
}
</style>
