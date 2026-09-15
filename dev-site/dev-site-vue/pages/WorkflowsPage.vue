<template>
  <div class="workflows-page">
    <v-container class="py-12" style="max-width: 56rem">
      <div class="d-flex align-center mb-6">
        <v-btn variant="text" :to="hubPath" class="mr-2">&larr; Hub</v-btn>
        <h1 class="text-h4">Workflows</h1>
      </div>

      <v-card v-if="planCwd" class="mb-8" variant="outlined">
        <v-card-title>Save as plan</v-card-title>
        <v-card-text>
          <v-alert type="info" density="compact" variant="tonal" class="mb-4">
            Will <code>cd</code> into <code>{{ planCwd }}</code> before running
            <code>{{ workflowId }}</code>.
          </v-alert>

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
            :disabled="!planName"
            @click="savePlan"
          >
            Save plan
          </v-btn>
          <p v-if="createPlanMutation.isError.value" class="text-error mt-2">
            {{ createPlanMutation.error.value?.message }}
          </p>
        </v-card-text>
      </v-card>

      <v-card variant="outlined">
        <v-card-title>Plans</v-card-title>
        <v-card-text>
          <p v-if="!plansQuery.data.value?.plans.length" class="text-body-2 text-medium-emphasis">
            No saved plans yet — save one from a package's Checkout page.
          </p>
          <div v-else>
            <div v-for="plan in plansQuery.data.value.plans" :key="plan.folder" class="mb-4">
              <div class="text-subtitle-1 font-weight-medium">{{ plan.name }}</div>
              <div class="text-caption text-medium-emphasis">{{ plan.folder }}</div>
              <PlanFileRow v-for="file in plan.files" :key="file.path" :file="file" />
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { WorkflowInputSchema } from "@saflib/new-workflows";
import {
  useWorkflowsQuery,
  usePlansQuery,
  useCreatePlanMutation,
} from "../requests/workflows-queries.ts";
import PlanFileRow from "../components/PlanFileRow.vue";

withDefaults(defineProps<{ hubPath?: string }>(), { hubPath: "/" });

const route = useRoute();
const router = useRouter();

const workflowsQuery = useWorkflowsQuery();
const formValues = reactive<Record<string, string | boolean>>({});

/**
 * The only way to start a workflow (as opposed to running an already-saved
 * plan) is from a package's Checkout page (`?workflow=...&cwd=...`) — see
 * `drizzleWorkflowHref` in CheckoutPage.vue. This card only exists to turn
 * that into a saved plan; it never runs anything itself.
 */
const workflowId = ref<string>();
const planCwd = ref<string>();
const planName = ref("");
watchEffect(() => {
  const workflow = route.query.workflow;
  const cwd = route.query.cwd;
  workflowId.value = typeof workflow === "string" && workflow ? workflow : undefined;
  planCwd.value = typeof cwd === "string" && cwd ? cwd : undefined;
});

const selectedWorkflow = computed(() =>
  workflowsQuery.data.value?.workflows.find((w) => w.id === workflowId.value),
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

const plansQuery = usePlansQuery();
const createPlanMutation = useCreatePlanMutation();
function savePlan() {
  if (!workflowId.value || !planCwd.value || !planName.value) return;
  createPlanMutation.mutate(
    {
      name: planName.value,
      body: {
        name: planName.value,
        steps: [
          { kind: "cd", path: planCwd.value },
          {
            kind: "call-workflow",
            workflowId: workflowId.value,
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
</script>

<style scoped>
.workflows-page {
  height: 100%;
  overflow-y: auto;
}
</style>
