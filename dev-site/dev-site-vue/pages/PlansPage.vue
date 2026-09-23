<template>
  <div class="plans-page">
    <v-container class="py-3" :class="{ 'plans-page__container--split': !planCwd }" fluid>
      <v-card v-if="planCwd" variant="outlined">
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
              :label="String(name)"
              :hint="prop.description"
              :required="isRequired(String(name))"
            />
            <v-checkbox
              v-for="(prop, name) in booleanProps"
              :key="name"
              v-model="formValues[name]"
              :label="String(name)"
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

      <ResizableColumns
        v-else
        class="plans-page__split"
        storage-key="dev-site.plans.navWidth"
        :default-left="260"
        :min-left="180"
        :max-left="420"
      >
        <template #left>
          <nav class="plans-nav">
            <v-btn
              class="plans-nav__new"
              size="small"
              variant="tonal"
              block
              @click="newProjectOpen = true"
            >
              New project
            </v-btn>
            <v-progress-linear v-if="filesQuery.isLoading.value" indeterminate class="mb-2" />
            <p
              v-else-if="!planGroups.length"
              class="text-body-2 text-medium-emphasis pa-2"
            >
              No plans yet — save one from a package's Checkout page.
            </p>
            <div v-for="group in planGroups" :key="group.folder" class="plans-nav__group">
              <div class="plans-nav__group-name">{{ group.name }}</div>
              <div v-if="groupClock(group)" class="plans-nav__group-stats">
                {{ groupClock(group) }}
              </div>
              <router-link
                v-for="file in group.files"
                :key="file.path"
                :to="planFileHref(group.folder, file.name)"
                class="plans-nav__file"
                :class="{ 'plans-nav__file--active': isActive(group.folder, file.name) }"
              >
                <PlanNavIcon :file-path="file.path" :kind="fileKindOf(file.name)" />
                <span class="plans-nav__file-text">
                  <span class="plans-nav__file-name">{{ file.name }}</span>
                  <span v-if="fileClock(file)" class="plans-nav__file-stats">{{ fileClock(file) }}</span>
                </span>
              </router-link>
            </div>
          </nav>
        </template>
        <template #right>
          <div
            class="plans-page__content"
            :class="{ 'plans-page__content--run': fileKind === 'workflow' }"
          >
            <p v-if="!fileName" class="text-body-2 text-medium-emphasis">
              Select a file on the left.
            </p>
            <template v-else-if="fileKind === 'workflow'">
              <h2 class="plans-page__run-heading text-h6">{{ fileName }}</h2>
              <v-progress-linear v-if="runsQuery.isLoading.value" indeterminate class="ma-4" />
              <RunView
                v-else
                :key="mostRecentRun?.id ?? selectedFilePath"
                :workflow-ref="selectedFilePath!"
                :run-id="mostRecentRun?.id"
                :base-run-ids="earlierPhaseRunIds"
                class="plans-page__run-view"
              />
            </template>
            <template v-else>
              <h2 class="text-h6 mb-3">{{ fileName }}</h2>
              <PlanFileContent :file-path="selectedFilePath!" :kind="fileKind" />
            </template>
          </div>
        </template>
      </ResizableColumns>
    </v-container>

    <v-dialog v-model="newProjectOpen" max-width="520">
      <v-card>
        <v-card-title class="text-body-1">New project</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newProjectName"
            label="Project name"
            hint="kebab-case — used for the folder name"
            persistent-hint
            class="mb-3"
          />
          <v-textarea
            v-model="newProjectPrompt"
            label="What should this project do?"
            rows="4"
            auto-grow
          />
          <p v-if="createPlanMutation.isError.value" class="text-error mt-2">
            {{ createPlanMutation.error.value?.message }}
          </p>
          <p v-if="createRunMutation.isError.value" class="text-error mt-2">
            {{ createRunMutation.error.value?.message }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="newProjectOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="createPlanMutation.isPending.value || createRunMutation.isPending.value"
            :disabled="!canStartProject"
            @click="startProject"
          >
            Start
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import type { WorkflowInputSchema } from "@saflib/new-workflows";
import {
  useWorkflowsQuery,
  useCreatePlanMutation,
  useCreateWorkflowRunMutation,
  useWorkflowRunsQuery,
  useSiblingMostRecentRunIds,
  useLatestWorkflowRuns,
} from "../requests/workflows-queries.ts";
import { useCheckout, useRepoFiles } from "../requests/queries.ts";
import { plansPrefix, fileKindOf, groupPlanFiles, planFileHref, type PlanGroup, type PlanFileEntry } from "../plan-files.ts";
import { formatClockSummary, summarizeRunTimings, type RunTiming } from "../plan-run-stats.ts";
import { useRunOrchestrator } from "../run-orchestrator.ts";
import { getAgentCli } from "../agent-settings.ts";
import ResizableColumns from "../components/ResizableColumns.vue";
import PlanFileContent from "../components/PlanFileContent.vue";
import PlanNavIcon from "../components/PlanNavIcon.vue";
import RunView from "../components/RunView.vue";

const route = useRoute();
const router = useRouter();

const checkoutQuery = useCheckout("");
const checkout = checkoutQuery.data;
const plansRootPrefix = computed(() => plansPrefix(checkout.value?.product_root));

// --- "Save as plan" — arriving from a package's Checkout page with
// ?workflow=&cwd=. Unchanged from the old WorkflowsPage: this is the only
// way to turn a code workflow into a runnable plan file; it doesn't run
// anything itself. ---
const workflowsQuery = useWorkflowsQuery();
const formValues = reactive<Record<string, string | boolean>>({});
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

const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const queryClient = useQueryClient();
const orchestrator = useRunOrchestrator();
const createPlanMutation = useCreatePlanMutation();
const createRunMutation = useCreateWorkflowRunMutation();
const newProjectOpen = ref(false);
const newProjectName = ref("");
const newProjectPrompt = ref("");
const canStartProject = computed(
  () =>
    checkoutQuery.isSuccess.value &&
    NAME_PATTERN.test(newProjectName.value.trim()) &&
    newProjectPrompt.value.trim().length > 0,
);

function startProject() {
  const name = newProjectName.value.trim();
  const prompt = newProjectPrompt.value.trim();
  if (!checkoutQuery.isSuccess.value || !NAME_PATTERN.test(name) || !prompt) return;
  const date = new Date().toISOString().split("T")[0];
  const folderRel = `${plansPrefix(checkout.value?.product_root)}/${date}-${name}`;
  createPlanMutation.mutate(
    {
      name,
      fileName: "phase-0-plan.workflow.yaml",
      body: {
        name: `Plan ${name}`,
        description:
          "Write the spec, pause for review, then write phase workflow files.",
        steps: [
          { kind: "cd", path: folderRel },
          {
            kind: "call-workflow",
            workflowId: "processes/spec-project",
            input: { name, prompt },
          },
        ],
      },
    },
    {
      onSuccess: (data) => {
        const file = data.plan.files[0];
        if (!file) return;
        queryClient.invalidateQueries({ queryKey: ["dev-site", "repo-files"] });
        createRunMutation.mutate(
          {
            id: file.path,
            body: { input: {}, mode: "run", agentConfig: { cli: getAgentCli() } },
          },
          {
            onSuccess: async (runData) => {
              newProjectOpen.value = false;
              newProjectName.value = "";
              newProjectPrompt.value = "";
              await router.push({ path: `/plans/${data.plan.folder}/${file.name}` });
              orchestrator.selectPlan(runData.run.id, file.path);
            },
          },
        );
      },
    },
  );
}
function savePlan() {
  if (!workflowId.value || !planCwd.value || !planName.value) return;
  createPlanMutation.mutate(
    {
      name: planName.value,
      body: {
        name: planName.value,
        steps: [
          { kind: "cd", path: planCwd.value },
          { kind: "call-workflow", workflowId: workflowId.value, input: { ...formValues } },
        ],
      },
    },
    {
      onSuccess: (data) => {
        planName.value = "";
        const file = data.plan.files[0];
        router.replace(
          file ? { path: `/plans/${data.plan.folder}/${file.name}` } : { path: "/plans" },
        );
      },
    },
  );
}

// --- Nav: every file under the plans folder, grouped by its immediate
// subfolder — read straight from the live repo tree (not `GET /api/plans`,
// which only surfaces .yaml/.yml/.json and silently drops everything
// else, e.g. a plan's own spec.md). `ref: "HEAD"` still picks up
// uncommitted working-tree files (see PackageDocsPane.vue's identical
// use), so a freshly-written plan shows up without a commit. ---
const filesQuery = useRepoFiles("", () => ({
  ref: "HEAD",
  prefix: plansRootPrefix.value,
}));

const planGroups = computed(() =>
  groupPlanFiles(filesQuery.data.value?.files ?? [], plansRootPrefix.value),
);
const workflowPaths = computed(() =>
  planGroups.value.flatMap((group) =>
    group.files.filter((file) => fileKindOf(file.name) === "workflow").map((file) => file.path),
  ),
);
const latestRuns = useLatestWorkflowRuns(() => workflowPaths.value);
const now = ref(new Date());
let nowTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = new Date();
  }, 30_000);
});
onUnmounted(() => {
  if (nowTimer) clearInterval(nowTimer);
});

function timingsFor(files: PlanFileEntry[]): RunTiming[] {
  const runs = latestRuns.value;
  return files.flatMap((file) => {
    const run = runs.get(file.path);
    return run ? [{ created_at: run.created_at, updated_at: run.updated_at, status: run.status }] : [];
  });
}

function groupClock(group: PlanGroup): string | undefined {
  const summary = summarizeRunTimings(
    timingsFor(group.files.filter((file) => fileKindOf(file.name) === "workflow")),
    now.value,
  );
  return summary ? formatClockSummary(summary) : undefined;
}

function fileClock(file: PlanFileEntry): string | undefined {
  if (fileKindOf(file.name) !== "workflow") return undefined;
  const summary = summarizeRunTimings(timingsFor([file]), now.value);
  return summary ? formatClockSummary(summary) : undefined;
}
// --- Selected file, read off the route itself rather than via router
// `props`, so this works regardless of whether a given router config
// wires props through. ---
const planName_ = computed(() => route.params.planName as string | undefined);
const fileName = computed(() => route.params.fileName as string | undefined);

function isActive(folder: string, name: string): boolean {
  return planName_.value === folder && fileName.value === name;
}

const selectedFilePath = computed(() => {
  if (!planName_.value || !fileName.value) return undefined;
  return planName_.value === "_"
    ? `${plansRootPrefix.value}/${fileName.value}`
    : `${plansRootPrefix.value}/${planName_.value}/${fileName.value}`;
});

const fileKind = computed(() => fileKindOf(fileName.value ?? ""));

// --- The selected workflow file's most recent run, shown inline (no
// "Open run"/"Start another run" click needed — see the ask). Only
// queried when a workflow file is actually selected. ---
const runsQuery = useWorkflowRunsQuery(() =>
  fileKind.value === "workflow" ? selectedFilePath.value : undefined,
);
const mostRecentRun = computed(() => runsQuery.data.value?.runs[0]);

// --- Earlier workflow files in this same plan folder, sorted before the
// selected one — e.g. phase-1/phase-2 before phase-3. Threaded into
// RunView as `baseRunIds` so "Preview changes" on phase-3 chains onto
// phase-1 and phase-2's own hypothetical results (their most recent run,
// if any — a phase never run yet is skipped, not treated as a hard
// requirement) instead of just the repo's current, possibly-behind state. ---
const earlierPhaseFilePaths = computed(() => {
  if (fileKind.value !== "workflow") return [];
  const group = planGroups.value.find((g) => g.folder === planName_.value);
  if (!group) return [];
  return group.files
    .filter((f) => f.name < (fileName.value ?? "") && fileKindOf(f.name) === "workflow")
    .map((f) => f.path);
});
const earlierPhaseRunIdsMaybe = useSiblingMostRecentRunIds(() => earlierPhaseFilePaths.value);
const earlierPhaseRunIds = computed(
  () => earlierPhaseRunIdsMaybe.value.filter((id): id is string => Boolean(id)),
);

// "Play current plan"'s cascade to the next phase file, once a run
// finishes on its own, now lives entirely in `run-orchestrator.ts` (a
// module-level singleton, not this page) — see its own doc comment for
// why: this page would otherwise need to stay mounted for the whole
// cascade to keep happening, and the previous approach of keying `RunView`
// by run id plus a one-shot `startInPlanMode` prop broke the moment you
// navigated away and back (see the bug report that prompted this).
</script>

<style scoped>
.plans-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.plans-page__container--split {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.plans-page__split {
  flex: 1 1 auto;
  min-height: 0;
}
.plans-nav {
  height: 100%;
  overflow-y: auto;
  padding: 0.25rem 0.5rem;
}
.plans-nav__new {
  margin-bottom: 0.5rem;
}
.plans-nav__group {
  margin-bottom: 0.75rem;
}
.plans-nav__group-name {
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem 0;
  opacity: 0.7;
}
.plans-nav__group-stats {
  font-size: 0.7rem;
  line-height: 1.3;
  padding: 0 0.5rem 0.25rem;
  opacity: 0.65;
}
.plans-nav__file-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.plans-nav__file-stats {
  font-family: inherit;
  font-size: 0.68rem;
  line-height: 1.3;
  opacity: 0.65;
}
.plans-nav__file {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem 0.3rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: monospace;
  text-decoration: none;
  color: inherit;
}
.plans-nav__file:hover {
  background: rgba(128, 128, 128, 0.08);
}
.plans-nav__file--active {
  background: rgba(var(--v-theme-primary), 0.1);
  font-weight: 600;
}
.plans-nav__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plans-page__content {
  height: 100%;
  overflow-y: auto;
  padding: 0.5rem 1rem;
}
/* Unlike the scrollable-text case above, a workflow's RunView manages its
   own internal scrolling (sidebar + log panes) and needs the full pane
   height to do it — no padding/overflow of our own to get in the way. */
.plans-page__content--run {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.plans-page__run-heading {
  flex: 0 0 auto;
  padding: 0.5rem 1rem 0;
}
.plans-page__run-view {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
