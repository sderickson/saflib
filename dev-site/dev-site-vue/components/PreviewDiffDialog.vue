<template>
  <v-dialog :model-value="modelValue" max-width="900" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>Preview changes</v-card-title>
      <v-card-text>
        <v-progress-linear v-if="isPending" indeterminate class="mb-4" />
        <v-alert v-if="isError" type="error" class="mb-4">
          {{ error?.message }}
        </v-alert>
        <template v-if="data">
          <v-alert
            v-if="baseRunIds.length > 0"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            Chained onto {{ baseRunIds.length }} earlier phase run(s) in this plan folder's own
            hypothetical results, not the repo's current state.
          </v-alert>
          <v-alert
            v-if="skippedEntries.length > 0"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            {{ skippedEntries.length }} step(s) need a real run to preview:
            <span v-for="(e, i) in skippedEntries" :key="i">
              {{ e.kind }} ({{ e.workflow_id }}){{ i < skippedEntries.length - 1 ? ", " : "" }}
            </span>
          </v-alert>
          <CommitDiffView :diff="data.commit_diff" />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DevSiteResponseBody } from "@saflib/dev-site-spec";
import CommitDiffView from "./CommitDiffView.vue";

type PreviewDiffData = DevSiteResponseBody["previewWorkflowRunDiff"][200];

const props = defineProps<{
  modelValue: boolean;
  isPending: boolean;
  isError: boolean;
  error?: { message?: string } | null;
  data?: PreviewDiffData;
  baseRunIds?: string[];
}>();
defineEmits<{ "update:modelValue": [value: boolean] }>();

const baseRunIds = computed(() => props.baseRunIds ?? []);
const skippedEntries = computed(() => props.data?.entries.filter((e) => !e.applied) ?? []);
</script>
