<template>
  <div class="pane-root diff-pane">
    <div class="diff-pane__toolbar">
      <code class="diff-pane__cmd">{{ command }}</code>
      <v-btn
        size="small"
        variant="text"
        prepend-icon="mdi-content-copy"
        @click="copyCommand"
      >
        {{ copyFeedback ? "Copied" : "Copy command" }}
      </v-btn>
      <v-btn
        v-if="githubCompareHref"
        size="small"
        variant="text"
        prepend-icon="mdi-github"
        :href="githubCompareHref"
        target="_blank"
        rel="noopener noreferrer"
      >
        Full compare
      </v-btn>
    </div>
    <div class="diff-pane__body">
      <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
      <v-alert v-if="error" type="error" density="compact" class="mb-2">
        {{ error.message }}
      </v-alert>
      <v-alert
        v-if="truncated"
        type="info"
        density="compact"
        variant="tonal"
        class="mb-2"
      >
        Showing the first part of the diff only — run the command locally for the full output.
      </v-alert>
      <p
        v-if="!isLoading && !error && !diffText.trim()"
        class="text-body-2 text-medium-emphasis"
      >
        No changes in this scope for the current comparison.
      </p>
      <UnifiedDiffView v-else-if="parsedFiles.length" :files="parsedFiles" />
      <pre v-else class="diff-pane__pre">{{ diffText }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRepoDiff } from "../requests/queries.ts";
import { parseUnifiedDiff } from "../parse-unified-diff.ts";
import { githubCompareUrl } from "../source-links.ts";
import UnifiedDiffView from "./UnifiedDiffView.vue";

const props = defineProps<{
  subdomain: string;
  baseRef: string;
  headRef: string;
  pathPrefix?: string;
  command: string;
  githubRepo?: string;
  localRepoRoot?: string;
}>();

const copyFeedback = ref(false);

const { data, isLoading, error } = useRepoDiff(
  props.subdomain,
  () => props.baseRef,
  () => props.headRef,
  () => props.pathPrefix,
);

const diffText = computed(() => data.value?.diff ?? "");
const truncated = computed(() => data.value?.truncated === true);
const parsedFiles = computed(() => parseUnifiedDiff(diffText.value));

const githubCompareHref = computed(() => {
  if (!props.githubRepo) return undefined;
  return githubCompareUrl(props.githubRepo, props.baseRef, props.headRef);
});

async function copyCommand() {
  if (typeof navigator.clipboard?.writeText !== "function") return;
  await navigator.clipboard.writeText(props.command);
  copyFeedback.value = true;
  window.setTimeout(() => {
    copyFeedback.value = false;
  }, 2000);
}
</script>

<style scoped>
.pane-root.diff-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.diff-pane__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
.diff-pane__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.diff-pane__cmd {
  flex: 1 1 12rem;
  font-size: 0.78rem;
  white-space: pre-wrap;
  word-break: break-word;
  opacity: 0.85;
}
.diff-pane__pre {
  margin: 0;
  padding: 0.75rem;
  overflow: auto;
  max-height: min(70vh, 48rem);
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  line-height: 1.35;
  white-space: pre;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 4px;
}
</style>
