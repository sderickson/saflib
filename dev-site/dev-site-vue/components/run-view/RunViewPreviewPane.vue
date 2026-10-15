<template>
  <div class="run-view__logs run-view__logs--pre-run">
    <div v-if="!previewShown" class="run-view__preview-cta">
      <v-btn size="x-large" color="primary" variant="tonal" @click="emit('open-preview')">
        Preview changes
      </v-btn>
    </div>
    <div v-else class="run-view__preview-result">
      <div class="run-view__preview-result-head">
        <span class="text-body-2 text-medium-emphasis">Preview changes</span>
        <v-spacer />
        <v-btn size="small" variant="text" @click="emit('close-preview')">Back</v-btn>
      </div>
      <v-progress-linear v-if="previewPending" indeterminate class="mb-4" />
      <v-alert v-if="previewError" type="error" class="mb-4">{{ previewError }}</v-alert>
      <v-alert
        v-if="previewDataReady && mechanicalFailures.length > 0"
        type="error"
        class="mb-4"
        density="compact"
        variant="tonal"
      >
        <div class="text-body-2 font-weight-medium mb-1">
          Preview found {{ mechanicalFailures.length }} mechanical failure{{
            mechanicalFailures.length === 1 ? "" : "s"
          }}:
        </div>
        <ul class="run-view__preview-failures">
          <li v-for="(e, i) in mechanicalFailures" :key="i">
            <strong>{{ e.kind }}</strong>
            ({{ e.workflow_id }}, step {{ e.step_index }}):
            {{ e.reason }}
          </li>
        </ul>
      </v-alert>
      <PreviewFileTree v-if="previewDataReady" :files="previewFiles" />
    </div>
  </div>
</template>

<script setup lang="ts">
import PreviewFileTree from "../PreviewFileTree.vue";
import type { PreviewFile } from "../../preview-file-tree.ts";

defineProps<{
  previewShown: boolean;
  previewPending: boolean;
  previewError?: string;
  previewDataReady: boolean;
  mechanicalFailures: {
    kind: string;
    workflow_id: string;
    step_index: number;
    reason?: string;
  }[];
  previewFiles: PreviewFile[];
}>();

const emit = defineEmits<{
  "open-preview": [];
  "close-preview": [];
}>();
</script>

<style scoped>
.run-view__logs {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  font-size: 0.85rem;
  padding: 0.75rem 1rem;
  background: rgba(128, 128, 128, 0.05);
}
.run-view__preview-failures {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
