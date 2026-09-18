<template>
  <div class="plans-page">
    <v-container class="py-6" :class="{ 'plans-page__container--split': !planCwd }" fluid>
      <div class="d-flex align-center mb-4">
        <v-btn variant="text" :to="hubPath" class="mr-2">&larr; Hub</v-btn>
        <h1 class="text-h4">Plans</h1>
      </div>

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
            <v-progress-linear v-if="filesQuery.isLoading.value" indeterminate class="mb-2" />
            <p
              v-else-if="!planGroups.length"
              class="text-body-2 text-medium-emphasis pa-2"
            >
              No plans yet — save one from a package's Checkout page.
            </p>
            <div v-for="group in planGroups" :key="group.folder" class="plans-nav__group">
              <div class="plans-nav__group-name">{{ group.name }}</div>
              <router-link
                v-for="file in group.files"
                :key="file.path"
                :to="planFileHref(group.folder, file.name)"
                class="plans-nav__file"
                :class="{ 'plans-nav__file--active': isActive(group.folder, file.name) }"
              >
                {{ file.name }}
              </router-link>
            </div>
          </nav>
        </template>
        <template #right>
          <div class="plans-page__content">
            <p v-if="!fileName" class="text-body-2 text-medium-emphasis">
              Select a file on the left.
            </p>
            <template v-else>
              <h2 class="text-h6 mb-3">{{ fileName }}</h2>
              <PlanWorkflowPane v-if="fileKind === 'workflow'" :file-path="selectedFilePath!" />
              <PlanFileContent v-else :file-path="selectedFilePath!" :kind="fileKind" />
            </template>
          </div>
        </template>
      </ResizableColumns>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { WorkflowInputSchema } from "@saflib/new-workflows";
import { useWorkflowsQuery, useCreatePlanMutation } from "../requests/workflows-queries.ts";
import { useRepoFiles } from "../requests/queries.ts";
import ResizableColumns from "../components/ResizableColumns.vue";
import PlanFileContent from "../components/PlanFileContent.vue";
import PlanWorkflowPane from "../components/PlanWorkflowPane.vue";

withDefaults(defineProps<{ hubPath?: string }>(), { hubPath: "/" });

const route = useRoute();
const router = useRouter();

/** Same assumption as the rest of this page: plans and their files live directly under this one folder, not nested. */
const PLANS_PREFIX = "test-product/plans";

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
const filesQuery = useRepoFiles("", () => ({ ref: "HEAD", prefix: PLANS_PREFIX }));

interface PlanFileEntry {
  name: string;
  path: string;
}
interface PlanGroup {
  folder: string;
  name: string;
  files: PlanFileEntry[];
}

const planGroups = computed<PlanGroup[]>(() => {
  const files = filesQuery.data.value?.files ?? [];
  const groups = new Map<string, PlanFileEntry[]>();
  for (const f of files) {
    const rel = f.path.slice(PLANS_PREFIX.length + 1);
    const slashIndex = rel.indexOf("/");
    // A file sitting directly under plans/, not inside its own dated
    // folder — not the shape this page otherwise assumes (see the spec:
    // "assume ... neither are nested"), but grouped under a synthetic "_"
    // folder rather than dropped, so it's still reachable at a normal
    // /plans/:planName/:fileName URL.
    const folder = slashIndex === -1 ? "_" : rel.slice(0, slashIndex);
    const name = slashIndex === -1 ? rel : rel.slice(slashIndex + 1);
    const arr = groups.get(folder) ?? [];
    arr.push({ name, path: f.path });
    groups.set(folder, arr);
  }
  return Array.from(groups.entries())
    .map(([folder, groupFiles]) => ({
      folder,
      name: folder === "_" ? "(ungrouped)" : folder.replace(/^\d{4}-\d{2}-\d{2}-/, ""),
      files: groupFiles.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    // Folder names are date-prefixed — descending sort puts the newest first.
    .sort((a, b) => b.folder.localeCompare(a.folder));
});

function planFileHref(folder: string, name: string): string {
  return `/plans/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`;
}

// --- Selected file, read off the route itself (same pattern as
// RunPage's runId) rather than via router `props`, so this works
// regardless of whether a given router config wires props through. ---
const planName_ = computed(() => route.params.planName as string | undefined);
const fileName = computed(() => route.params.fileName as string | undefined);

function isActive(folder: string, name: string): boolean {
  return planName_.value === folder && fileName.value === name;
}

const selectedFilePath = computed(() => {
  if (!planName_.value || !fileName.value) return undefined;
  return planName_.value === "_"
    ? `${PLANS_PREFIX}/${fileName.value}`
    : `${PLANS_PREFIX}/${planName_.value}/${fileName.value}`;
});

type FileKind = "markdown" | "workflow" | "text";
const fileKind = computed<FileKind>(() => {
  const name = fileName.value ?? "";
  if (/\.md$/i.test(name)) return "markdown";
  if (/\.ya?ml$/i.test(name)) return "workflow";
  return "text";
});
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
.plans-nav__group {
  margin-bottom: 0.75rem;
}
.plans-nav__group-name {
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  opacity: 0.7;
}
.plans-nav__file {
  display: block;
  padding: 0.3rem 0.5rem 0.3rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: monospace;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plans-nav__file:hover {
  background: rgba(128, 128, 128, 0.08);
}
.plans-nav__file--active {
  background: rgba(var(--v-theme-primary), 0.1);
  font-weight: 600;
}
.plans-page__content {
  height: 100%;
  overflow-y: auto;
  padding: 0.5rem 1rem;
}
</style>
