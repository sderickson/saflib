<template>
  <div class="plan-file-content">
    <v-progress-linear v-if="fileQuery.isLoading.value" indeterminate class="mb-2" />
    <v-alert v-else-if="fileQuery.isError.value" type="error" density="compact">
      {{ fileQuery.error.value?.message }}
    </v-alert>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else-if="kind === 'markdown'" class="plan-file-content__markdown" v-html="html" />
    <pre v-else class="plan-file-content__text">{{ fileQuery.data.value?.content }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { marked } from "marked";
import { useRepoFile } from "../requests/queries.ts";

const props = defineProps<{
  filePath: string;
  /** `.md` renders through `marked`; anything else (the "render as plain text" catch-all) shows raw content. */
  kind: "markdown" | "text";
}>();

// Same-origin dev-site request (empty subdomain), always the live checkout
// — a plan file that was just written to disk by a workflow step should
// show up immediately, not only once committed. See `PackageDocsPane.vue`
// for the same `ref: "HEAD"` + working-tree-merge pattern.
const fileQuery = useRepoFile("", () => ({ ref: "HEAD", path: props.filePath }));

const html = computed(() => {
  const content = fileQuery.data.value?.content;
  if (!content) return "";
  return marked.parse(content, { async: false }) as string;
});
</script>

<style scoped>
.plan-file-content__text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 0.85rem;
  margin: 0;
}
.plan-file-content__markdown :deep(h1),
.plan-file-content__markdown :deep(h2),
.plan-file-content__markdown :deep(h3) {
  margin-top: 1.1em;
  margin-bottom: 0.4em;
}
.plan-file-content__markdown :deep(p),
.plan-file-content__markdown :deep(ul),
.plan-file-content__markdown :deep(ol) {
  margin: 0.5em 0;
}
.plan-file-content__markdown :deep(pre) {
  overflow: auto;
  padding: 0.75rem;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 4px;
  font-size: 0.8rem;
}
.plan-file-content__markdown :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85em;
}
.plan-file-content__markdown :deep(a) {
  color: rgb(var(--v-theme-primary));
}
</style>
