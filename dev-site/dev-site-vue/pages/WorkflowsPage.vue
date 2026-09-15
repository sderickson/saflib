<template>
  <v-container class="py-12" style="max-width: 56rem">
    <div class="d-flex align-center mb-6">
      <v-btn variant="text" :to="hubPath" class="mr-2">&larr; Hub</v-btn>
      <h1 class="text-h4">Workflows</h1>
    </div>

    <v-card class="mb-8" variant="outlined">
      <v-card-title>{{ planCwd ? "Save as plan" : "Start a run" }}</v-card-title>
      <v-card-text>
        <v-alert v-if="planCwd" type="info" density="compact" variant="tonal" class="mb-4">
          Will <code>cd</code> into <code>{{ planCwd }}</code> before running
          <code>{{ selectedWorkflowId }}</code>.
        </v-alert>

        <v-select
          v-model="selectedWorkflowId"
          :items="workflowItems"
          item-title="title"
          item-value="value"
          label="Workflow"
          :disabled="Boolean(planCwd)"
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

        <template v-if="planCwd">
          <v-text-field
            v-model="planName"
            label="Plan name"
            hint="kebab-case — used for the folder and file name"
            persistent-hint
            required
          />
          <v-btn
            color="primary"
            class="mt-3"
            :loading="createPlanMutation.isPending.value"
            :disabled="!selectedWorkflowId || !planName"
            @click="savePlan"
          >
            Save plan
          </v-btn>
          <p v-if="createPlanMutation.isError.value" class="text-error mt-2">
            {{ createPlanMutation.error.value?.message }}
          </p>
        </template>
        <v-btn
          v-else
          color="primary"
          :loading="createRunMutation.isPending.value"
          :disabled="!selectedWorkflowId"
          @click="startRun"
        >
          Start
        </v-btn>
        <p v-if="!planCwd && createRunMutation.isError.value" class="text-error mt-2">
          {{ createRunMutation.error.value?.message }}
        </p>
      </v-card-text>
    </v-card>

    <v-card class="mb-8" variant="outlined">
      <v-card-title>Plans</v-card-title>
      <v-card-text>
        <p v-if="!plansQuery.data.value?.plans.length" class="text-body-2 text-medium-emphasis">
          No saved plans yet — save one above, or from a package's Checkout page.
        </p>
        <v-list v-else lines="two">
          <v-list-item v-for="plan in plansQuery.data.value.plans" :key="plan.folder">
            <v-list-item-title>{{ plan.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ plan.folder }}</v-list-item-subtitle>
            <template #append>
              <v-btn
                v-for="file in plan.files"
                :key="file.path"
                size="small"
                variant="tonal"
                color="primary"
                :loading="createRunMutation.isPending.value"
                @click="runPlanFile(file.path)"
              >
                Run {{ file.name }}
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
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
import { ref, computed, reactive, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { WorkflowInputSchema } from "@saflib/new-workflows";
import {
  useWorkflowsQuery,
  useCreateWorkflowRunMutation,
  useWorkflowRunQuery,
  useWorkflowRunLogsQuery,
  useAdvanceWorkflowRunMutation,
  usePlansQuery,
  useCreatePlanMutation,
} from "../requests/workflows-queries.ts";
import { useRunEvents } from "../requests/use-run-events.ts";

withDefaults(defineProps<{ hubPath?: string }>(), { hubPath: "/" });

const route = useRoute();
const router = useRouter();

const workflowsQuery = useWorkflowsQuery();
const selectedWorkflowId = ref<string>();
const formValues = reactive<Record<string, string | boolean>>({});
const activeRunId = ref<string>();

/**
 * Arriving from a package's Checkout page (`?workflow=...&cwd=...`) fixes
 * the workflow + cd target and switches this card from "run it now" to
 * "save it as a plan" — see `drizzleWorkflowHref` in CheckoutPage.vue.
 */
const planCwd = ref<string>();
const planName = ref("");
watchEffect(() => {
  const workflow = route.query.workflow;
  const cwd = route.query.cwd;
  if (typeof workflow === "string" && workflow) selectedWorkflowId.value = workflow;
  planCwd.value = typeof cwd === "string" && cwd ? cwd : undefined;
});

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

function runPlanFile(path: string) {
  createRunMutation.mutate(
    { id: path, body: { input: {} } },
    {
      onSuccess: (data) => {
        activeRunId.value = data.run.id;
      },
    },
  );
}

const plansQuery = usePlansQuery();
const createPlanMutation = useCreatePlanMutation();
function savePlan() {
  if (!selectedWorkflowId.value || !planCwd.value || !planName.value) return;
  createPlanMutation.mutate(
    {
      name: planName.value,
      body: {
        name: planName.value,
        steps: [
          { kind: "cd", path: planCwd.value },
          {
            kind: "call-workflow",
            workflowId: selectedWorkflowId.value,
            input: { ...formValues },
          },
        ],
      },
    },
    {
      onSuccess: () => {
        planName.value = "";
        router.replace({ path: "/workflows" });
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
