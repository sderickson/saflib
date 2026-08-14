<template>
  <div class="pane-root">
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error.message }}</v-alert>

    <div
      v-if="!isLoading && !entities.length"
      class="text-body-2 text-medium-emphasis"
    >
      No OpenAPI schemas or route resources found for this package.
    </div>

    <ResizableColumns
      v-else-if="entities.length"
      class="pane-split"
      storage-key="dev-site.specRoutes.entityNavWidth"
      :default-left="180"
      :min-left="120"
      :max-left="320"
    >
      <template #left>
        <div class="pane-nav">
          <button
            type="button"
            class="spec-all"
            :class="{ 'spec-all--selected': selectedKey === null }"
            @click="selectedKey = null"
          >
            <v-icon size="x-small" icon="mdi-folder-outline" class="entity-nav__icon" />
            <span>All</span>
          </button>
          <ul class="entity-nav">
            <li v-for="e in entities" :key="e.key" class="entity-nav__item">
              <button
                type="button"
                class="entity-nav__row"
                :class="{ 'entity-nav__row--selected': selectedKey === e.key }"
                :title="presenceTitle(e.presence)"
                @click="selectedKey = e.key"
              >
                <v-icon
                  size="x-small"
                  :icon="presenceIcon(e.presence)"
                  class="entity-nav__icon"
                />
                <span class="entity-nav__label">{{ e.label }}</span>
              </button>
            </li>
          </ul>
        </div>
      </template>
      <template #right>
        <div class="pane-panel">
        <div
          v-for="e in visibleEntities"
          :key="e.key"
          class="entity-block"
        >
          <h3 class="entity-block__title">
            {{ e.label }}
            <span class="entity-block__presence">{{ presenceTitle(e.presence) }}</span>
          </h3>

          <div v-if="e.schema" class="table-card">
            <div class="table-card__head">
              <code class="table-card__name">{{ e.schema.name }}</code>
              <a
                href="#"
                class="table-card__file"
                @click.prevent="openFile(repoPath(e.schema.yamlPath))"
              >
                {{ e.schema.yamlPath }}
              </a>
            </div>
            <p v-if="e.schema.description" class="table-card__doc">
              {{ e.schema.description }}
            </p>
            <ul
              v-if="e.usedByPackages.length"
              class="table-card__pkgs"
            >
              <li
                v-for="pkg in e.usedByPackages"
                :key="pkg"
                class="table-card__pkg"
              >
                <code>{{ pkg }}</code>
              </li>
            </ul>
            <p
              v-if="e.schema.referencedByOperations.length"
              class="table-card__refs"
            >
              Referenced by:
              <template
                v-for="(opId, i) in e.schema.referencedByOperations"
                :key="opId"
              >
                <code>{{ opId }}</code><span v-if="i < e.schema.referencedByOperations.length - 1">, </span>
              </template>
            </p>
            <ul
              v-if="e.schema.usedBy.length"
              class="table-card__used"
            >
              <li
                v-for="u in e.schema.usedBy"
                :key="u.packageName + ':' + u.repoPath"
              >
                <a
                  href="#"
                  class="table-card__file"
                  @click.prevent="openFile(u.repoPath)"
                >
                  {{ u.packageName }}/{{ u.filePath }}
                </a>
              </li>
            </ul>
            <ul class="table-card__cols">
              <li
                v-for="c in e.schema.properties"
                :key="c.name"
                class="table-card__col"
              >
                <div class="table-card__col-main">
                  <code>{{ c.name }}</code>
                  <span class="text-medium-emphasis">{{ c.typeKind }}</span>
                </div>
                <p v-if="c.docstring" class="table-card__col-doc">
                  {{ c.docstring }}
                </p>
              </li>
            </ul>
          </div>
          <template v-else>
            <p class="text-body-2 text-medium-emphasis mb-2">
              REST resource <code>{{ e.resource }}</code> — no matching business-object schema.
            </p>
            <ul
              v-if="e.usedByPackages.length"
              class="table-card__pkgs mb-3"
            >
              <li
                v-for="pkg in e.usedByPackages"
                :key="pkg"
                class="table-card__pkg"
              >
                <code>{{ pkg }}</code>
              </li>
            </ul>
          </template>

          <div v-if="e.resource && e.presence === 'both'" class="resource-hint">
            Resource: <code>routes/{{ e.resource }}/</code>
          </div>

          <ul v-if="e.operations.length" class="op-list">
            <li
              v-for="op in e.operations"
              :key="op.operationId + op.method + op.path"
            >
              <PackageRouteCard
                :operation="normalizeOp(op)"
                :route-repo-path="repoPath(op.yamlPath)"
                :open-file="openFile"
              />
            </li>
          </ul>
          <p
            v-else-if="e.presence === 'object'"
            class="text-body-2 text-medium-emphasis"
          >
            No REST endpoints linked to this schema.
          </p>
        </div>
        </div>
      </template>
    </ResizableColumns>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import PackageRouteCard, {
  type RouteCardOperation,
} from "./PackageRouteCard.vue";
import ResizableColumns from "./ResizableColumns.vue";
import { useCommitPackage } from "../requests/queries.ts";
import { openSource } from "../source-links.ts";
import { repoPathPrefix } from "../repo-paths.ts";

type SpecPresence = "object" | "routes" | "both";

interface SpecUsedBy {
  packageName: string;
  filePath: string;
  repoPath: string;
}

interface SpecFileRef {
  filePath: string;
  repoPath: string;
}

interface SpecTestSpec {
  fullName: string;
}

interface SpecEntity {
  key: string;
  label: string;
  presence: SpecPresence;
  resource: string | null;
  schema: {
    name: string;
    yamlPath: string;
    description?: string | null;
    properties: Array<{
      name: string;
      typeKind: string;
      docstring?: string | null;
    }>;
    usedBy: SpecUsedBy[];
    referencedByOperations: string[];
  } | null;
  usedByPackages: string[];
  operations: Array<{
    operationId: string;
    method: string;
    path: string;
    summary?: string | null;
    tags?: string[];
    yamlPath: string;
    routeStem?: string | null;
    handler?: SpecFileRef | null;
    request?: SpecFileRef | null;
    fake?: SpecFileRef | null;
    handlerTests?: SpecTestSpec[];
    requestSchemas: string[];
    responseSchemas: string[];
    usedBy: SpecUsedBy[];
    enqueues?: string[];
    enqueuedBy?: string[];
  }>;
}

const props = defineProps<{
  subdomain: string;
  commitHash: string;
  packageName: string;
  packageDirectory: string;
  productRoot: string;
  githubRepo?: string;
  githubRef?: string;
  localRepoRoot?: string;
}>();

const selectedKey = ref<string | null>(null);

const { data, isLoading, error } = useCommitPackage(
  props.subdomain,
  () => props.commitHash,
  () => props.packageName,
);

const detail = computed(() => data.value?.packageDetail);
const entities = computed(
  () => (detail.value?.specInventory?.entities ?? []) as SpecEntity[],
);

const visibleEntities = computed(() => {
  if (selectedKey.value == null) return entities.value;
  return entities.value.filter((e) => e.key === selectedKey.value);
});

function presenceIcon(p: SpecPresence): string {
  if (p === "both") return "mdi-cube";
  if (p === "routes") return "mdi-api";
  return "mdi-cube-outline";
}

function presenceTitle(p: SpecPresence): string {
  if (p === "both") return "Schema + REST";
  if (p === "routes") return "REST only";
  return "Schema only";
}

function repoPath(packageRelative: string): string {
  const prefix = repoPathPrefix(props.productRoot, props.packageDirectory);
  if (!prefix) return packageRelative;
  return `${prefix}/${packageRelative}`;
}

function normalizeOp(
  op: SpecEntity["operations"][number],
): RouteCardOperation {
  return {
    operationId: op.operationId,
    method: op.method,
    path: op.path,
    summary: op.summary,
    tags: op.tags ?? [],
    yamlPath: op.yamlPath,
    routeStem: op.routeStem ?? null,
    handler: op.handler ?? null,
    request: op.request ?? null,
    fake: op.fake ?? null,
    handlerTests: op.handlerTests ?? [],
    requestSchemas: op.requestSchemas,
    responseSchemas: op.responseSchemas,
    usedBy: op.usedBy ?? [],
    enqueues: op.enqueues,
    enqueuedBy: op.enqueuedBy,
  };
}

function openFile(path: string) {
  openSource(path, {
    githubRef: props.githubRef,
    githubRepo: props.githubRepo,
    localRepoRoot: props.localRepoRoot,
  });
}
</script>

<style scoped>
.pane-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.pane-split {
  flex: 1 1 auto;
  min-height: 0;
}
.pane-nav,
.pane-panel {
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 0.25rem 0.35rem;
}
.spec-all {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.2rem 0.3rem;
  border-radius: 4px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  margin-bottom: 0.15rem;
}
.spec-all:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.spec-all--selected {
  background: rgba(var(--v-theme-primary), 0.12);
}
.entity-nav {
  list-style: none;
  margin: 0;
  padding: 0;
}
.entity-nav__item {
  margin: 0.05rem 0;
}
.entity-nav__row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.entity-nav__row:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.entity-nav__row--selected {
  background: rgba(var(--v-theme-primary), 0.12);
}
.entity-nav__label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.entity-nav__icon {
  opacity: 0.7;
  flex-shrink: 0;
}
.entity-block {
  margin-bottom: 1.75rem;
}
.entity-block__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}
.entity-block__presence {
  font-size: 0.75rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.table-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}
.table-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}
.table-card__name {
  font-weight: 600;
}
.table-card__file {
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
  user-select: text;
}
.table-card__doc {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.table-card__refs {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.table-card__pkgs {
  list-style: none;
  margin: 0 0 0.65rem;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
}
.table-card__pkg code {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.table-card__cols {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}
.table-card__used {
  list-style: none;
  margin: 0 0 0.5rem;
  padding: 0;
  display: grid;
  gap: 0.2rem;
  font-size: 0.8125rem;
}
.table-card__col-main {
  display: flex;
  gap: 0.75rem;
  font-size: 0.875rem;
}
.table-card__col-doc {
  margin: 0.15rem 0 0;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.resource-hint {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 0.5rem;
}
.op-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}
</style>
