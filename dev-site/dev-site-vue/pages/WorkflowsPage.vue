<template>
  <v-container class="py-12" style="max-width: 56rem">
    <div class="d-flex align-center mb-6">
      <v-btn variant="text" :to="hubPath" class="mr-2">&larr; Hub</v-btn>
      <h1 class="text-h4">Workflows</h1>
    </div>

    <v-card class="mb-8" variant="outlined">
      <v-card-title>Start a run</v-card-title>
      <v-card-text>
        <v-select
          v-model="selectedWorkflowId"
          :items="workflowItems"
          item-title="title"
          item-value="value"
          label="Workflow"
          :loading="workflowsQuery.isPending.value"
        />

        <template v-if="selectedWorkflow?.inputSchema">
          <v-text-field
            v-for="(prop, name) in stringProps"
            :key="name"
            v-model="formValues[name]"
            :label="name"
            :hint="prop.description"
            :required="isRequired(name)"
          />
          <v-checkbox
            v-for="(prop, name) in booleanProps"
            :key="name"
            v-model="formValues[name]"
            :label="name"
            :hint="prop.description"
          />
        </template>

        <v-btn
          color="primary"
          :loading="createRunMutation.isPending.value"
          :disabled="!selectedWorkflowId"
          @click="startRun"
        >
          Start
        </v-btn>
        <p v-if="createRunMutation.isError.value" class="text-error mt-2">
          {{ createRunMutation.error.value?.message }}
        </p>
      </v-card-text>
    </v-card>

    <v-card v-if="activeRunId" variant="outlined">
      <v-card-title class="d-flex align-center">
        Run {{ activeRunId }}
        <v-chip class="ml-2" size="small" :color="statusColor">{{ run?.status ?? "…" }}</v-chip>
        <v-spacer />
        <span class="text-body-2 text-medium-emphasis">step {{ run?.current_step_index }}</span>
      </v-card-title>
      <v-card-text>
        <div class="log-list mb-4">
          <div v-for="log in logs" :key="log.id" :class="['log-line', `log-${log.channel}`]">
            <span class="log-channel">[{{ log.channel }}]</span> {{ log.content }}
          </div>
        </div>
        <div v-if="run?.status === 'awaiting_prompt'" class="mb-4">
          <em>Waiting on the agent.</em>
        </div>
        <div v-if="run?.status === 'awaiting_user'" class="mb-4">
          <em>{{ (advanceMutation.data.value as { message?: string } | undefined)?.message }}</em>
        </div>
        <v-btn
          color="primary"
          :loading="advanceMutation.isPending.value"
          :disabled="run?.status === 'done' || run?.status === 'failed'"
          @click="advanceMutation.mutate(activeRunId!)"
        >
          Advance
        </v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import type { WorkflowInputSchema } from "@saflib/new-workflows";
import {
  useWorkflowsQuery,
  useCreateWorkflowRunMutation,
  useWorkflowRunQuery,
  useWorkflowRunLogsQuery,
  useAdvanceWorkflowRunMutation,
} from "../requests/workflows-queries.ts";
import { useRunEvents } from "../requests/use-run-events.ts";

withDefaults(defineProps<{ hubPath?: string }>(), { hubPath: "/" });

const workflowsQuery = useWorkflowsQuery();
const selectedWorkflowId = ref<string>();
const formValues = reactive<Record<string, string | boolean>>({});
const activeRunId = ref<string>();

const workflowItems = computed(
  () =>
    workflowsQuery.data.value?.workflows.map((w) => ({ title: `${w.id} — ${w.description}`, value: w.id })) ?? [],
);
const selectedWorkflow = computed(() =>
  workflowsQuery.data.value?.workflows.find((w) => w.id === selectedWorkflowId.value),
);
const inputSchema = computed(
  () => selectedWorkflow.value?.inputSchema as WorkflowInputSchema | undefined,
);
const stringProps = computed(() =>
  Object.fromEntries(
    Object.entries(inputSchema.value?.properties ?? {}).filter(([, p]) => p.type !== "boolean"),
  ),
);
const booleanProps = computed(() =>
  Object.fromEntries(
    Object.entries(inputSchema.value?.properties ?? {}).filter(([, p]) => p.type === "boolean"),
  ),
);
function isRequired(name: string): boolean {
  return inputSchema.value?.required?.includes(name) ?? false;
}

const createRunMutation = useCreateWorkflowRunMutation();
function startRun() {
  if (!selectedWorkflowId.value) return;
  createRunMutation.mutate(
    { id: selectedWorkflowId.value, body: { input: { ...formValues } } },
    {
      onSuccess: (data) => {
        activeRunId.value = data.run.id;
      },
    },
  );
}

const runQuery = useWorkflowRunQuery(activeRunId);
const run = computed(() => runQuery.data.value?.run);
const logsQuery = useWorkflowRunLogsQuery(activeRunId);
const logs = computed(() => logsQuery.data.value?.logs ?? []);
const advanceMutation = useAdvanceWorkflowRunMutation();
useRunEvents(activeRunId);

const statusColor = computed(() => {
  switch (run.value?.status) {
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
});
</script>

<style scoped>
.log-list {
  max-height: 24rem;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.85rem;
  background: rgba(128, 128, 128, 0.08);
  border-radius: 4px;
  padding: 0.5rem;
}
.log-line {
  white-space: pre-wrap;
}
.log-channel {
  opacity: 0.6;
}
.log-tool {
  color: #4caf50;
}
.log-agent {
  color: #2196f3;
}
.log-agent-input {
  color: #ff9800;
}
.log-terminal {
  opacity: 0.7;
}
</style>
