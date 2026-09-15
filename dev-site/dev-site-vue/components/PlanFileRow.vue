<template>
  <div class="plan-file-row">
    <div class="plan-file-row__head">
      <code>{{ file.name }}</code>
      <v-btn
        size="small"
        color="primary"
        variant="tonal"
        :loading="createRunMutation.isPending.value"
        @click="startNewRun"
      >
        New run
      </v-btn>
    </div>
    <v-progress-linear v-if="runsQuery.isPending.value" indeterminate density="compact" />
    <ul v-else-if="runs.length" class="plan-file-row__runs">
      <li v-for="run in runs" :key="run.id">
        <router-link :to="`/workflows/runs/${run.id}`" class="plan-file-row__run-link">
          <v-chip size="x-small" :color="statusColor(run.status)" variant="flat">
            {{ run.status }}
          </v-chip>
          <span class="text-body-2">{{ formatDateTime(run.created_at) }}</span>
        </router-link>
      </li>
    </ul>
    <p v-else class="text-body-2 text-medium-emphasis">No runs yet.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { PlanFile } from "@saflib/new-workflows-spec";
import { useWorkflowRunsQuery, useCreateWorkflowRunMutation } from "../requests/workflows-queries.ts";

const props = defineProps<{ file: PlanFile }>();
const router = useRouter();

const runsQuery = useWorkflowRunsQuery(() => props.file.path);
const runs = computed(() => runsQuery.data.value?.runs ?? []);

const createRunMutation = useCreateWorkflowRunMutation();
function startNewRun() {
  createRunMutation.mutate(
    { id: props.file.path, body: { input: {}, mode: "run", agentConfig: { cli: "claude-agent" } } },
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

<style scoped>
.plan-file-row {
  padding: 0.5rem 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.plan-file-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}
.plan-file-row__runs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.plan-file-row__run-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: inherit;
}
.plan-file-row__run-link:hover {
  text-decoration: underline;
}
</style>
