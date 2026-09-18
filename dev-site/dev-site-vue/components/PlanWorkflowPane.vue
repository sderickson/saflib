<template>
  <div class="plan-workflow-pane">
    <v-progress-linear v-if="runsQuery.isLoading.value" indeterminate class="mb-2" />
    <template v-else-if="mostRecentRun">
      <div class="d-flex align-center ga-2 mb-3">
        <v-chip size="small" :color="statusColor(mostRecentRun.status)" variant="flat">
          {{ mostRecentRun.status }}
        </v-chip>
        <span class="text-body-2 text-medium-emphasis">{{ formatDateTime(mostRecentRun.created_at) }}</span>
      </div>
      <div class="d-flex ga-2">
        <v-btn color="primary" :to="`/workflows/runs/${mostRecentRun.id}`">Open run</v-btn>
        <v-btn
          variant="tonal"
          :loading="createRunMutation.isPending.value"
          @click="startNewRun"
        >
          Start another run
        </v-btn>
      </div>
    </template>
    <template v-else>
      <p class="text-body-2 text-medium-emphasis mb-3">This workflow hasn't been run yet.</p>
      <v-btn color="primary" :loading="createRunMutation.isPending.value" @click="startNewRun">
        Start workflow
      </v-btn>
    </template>
    <p v-if="createRunMutation.isError.value" class="text-error mt-2">
      {{ createRunMutation.error.value?.message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import {
  useWorkflowRunsQuery,
  useCreateWorkflowRunMutation,
} from "../requests/workflows-queries.ts";

const props = defineProps<{ filePath: string }>();
const router = useRouter();

const runsQuery = useWorkflowRunsQuery(() => props.filePath);
// `listByWorkflowRefWorkflowRun` (the backing query) already orders
// newest-first, so the first entry is the most recent run.
const mostRecentRun = computed(() => runsQuery.data.value?.runs[0]);

const createRunMutation = useCreateWorkflowRunMutation();
function startNewRun() {
  createRunMutation.mutate(
    { id: props.filePath, body: { input: {}, mode: "run", agentConfig: { cli: "claude-agent" } } },
    {
      onSuccess: (data) => {
        router.push(`/workflows/runs/${data.run.id}`);
      },
    },
  );
}

function statusColor(status: string): string | undefined {
  switch (status) {
    case "done":
      return "success";
    case "failed":
      return "error";
    case "awaiting_prompt":
    case "awaiting_user":
      return "warning";
    default:
      return undefined;
  }
}

function formatDateTime(dateTimeString: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateTimeString));
  } catch {
    return dateTimeString;
  }
}
</script>
