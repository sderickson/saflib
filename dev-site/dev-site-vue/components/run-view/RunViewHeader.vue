<template>
  <header class="run-view__head">
    <v-chip v-if="runId" size="small" :color="statusVisual.color">
      <v-progress-circular
        v-if="statusVisual.spinner"
        size="12"
        width="2"
        indeterminate
        class="mr-1"
      />
      <v-icon v-else-if="statusVisual.icon" :icon="statusVisual.icon" size="14" class="mr-1" />
      {{ statusVisual.label }}
    </v-chip>
    <v-chip v-else size="small">not started</v-chip>
    <span v-if="runClock" class="run-view__clock text-body-2 text-medium-emphasis">{{ runClock }}</span>
    <v-btn
      v-if="canSeeChanges"
      variant="text"
      size="small"
      density="comfortable"
      color="primary"
      class="run-view__see-changes"
      prepend-icon="mdi-file-compare"
      @click="emit('see-changes')"
    >
      see changes
    </v-btn>
    <v-spacer />
    <span v-if="runId" class="text-body-2 text-medium-emphasis">step {{ currentStepIndex }}</span>
  </header>
</template>

<script setup lang="ts">
import type { RunStatusVisual } from "../../run-status-visual.ts";

defineProps<{
  runId?: string;
  runClock?: string;
  currentStepIndex?: number;
  statusVisual: RunStatusVisual;
  /** Run started inside a git repo, so there's a base commit to diff from. */
  canSeeChanges: boolean;
}>();

const emit = defineEmits<{ "see-changes": [] }>();
</script>

<style scoped>
.run-view__head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.run-view__clock {
  margin-left: 0.5rem;
}
.run-view__see-changes {
  margin-left: 0.25rem;
  text-transform: none;
}
</style>
