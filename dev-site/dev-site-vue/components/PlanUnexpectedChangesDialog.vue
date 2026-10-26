<template>
  <v-dialog :model-value="modelValue" max-width="640" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-body-1">Unexpected changes: {{ planName }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Files changed outside the files each phase declared, from each phase's latest run.
        </p>
        <div v-for="change in changes" :key="`${change.run_id}-${change.step_index}`" class="unexpected-change">
          <div class="unexpected-change__step">
            <span class="unexpected-change__phase">{{ phaseName(change.workflow_ref) }}</span>
            · step {{ change.step_index + 1 }}<template v-if="change.label">: {{ change.label }}</template>
            <router-link
              v-if="change.commit_hash"
              :to="`/history/commits/${change.commit_hash}`"
              class="unexpected-change__commit"
            >
              {{ change.commit_hash.slice(0, 9) }}
            </router-link>
          </div>
          <ul class="unexpected-change__files">
            <li v-for="file in change.files" :key="file">{{ file }}</li>
          </ul>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { UnexpectedChangeEntry } from "../plan-files.ts";

defineProps<{
  modelValue: boolean;
  planName: string;
  changes: UnexpectedChangeEntry[];
}>();

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

function phaseName(workflowRef: string): string {
  return workflowRef.split("/").pop() ?? workflowRef;
}
</script>

<style scoped>
.unexpected-change {
  margin-bottom: 0.75rem;
}
.unexpected-change__step {
  font-size: 0.85rem;
}
.unexpected-change__phase {
  font-family: monospace;
  font-weight: 600;
}
.unexpected-change__commit {
  margin-left: 0.5rem;
  font-family: monospace;
  font-size: 0.8rem;
}
.unexpected-change__files {
  font-family: monospace;
  font-size: 0.8rem;
  margin: 0.25rem 0 0 1.25rem;
}
</style>
