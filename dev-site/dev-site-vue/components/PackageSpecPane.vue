<template>
  <div class="pane-root">
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error.message }}</v-alert>

    <div v-if="!isLoading && !fileNav.length" class="text-body-2 text-medium-emphasis">
      No source or test modules found for this package.
    </div>

    <ResizableColumns
      v-else-if="fileNav.length"
      class="pane-split"
      storage-key="dev-site.spec.moduleNavWidth"
      :default-left="180"
      :min-left="120"
      :max-left="320"
    >
      <template #left>
        <div class="pane-nav">
          <button
            type="button"
            class="spec-all"
            :class="{ 'spec-all--selected': scope.kind === 'all' }"
            @click="setScope({ kind: 'all' })"
          >
            <v-icon size="x-small" icon="mdi-folder-outline" />
            <span>All modules</span>
          </button>
          <TestFileNav
            :nodes="fileNav"
            :selected="scope"
            :vue-bundles="vueBundles"
            @select="setScope"
          />
        </div>
      </template>
      <template #right>
        <div class="pane-panel">
          <header
            v-if="scope.kind !== 'all'"
            class="scope-header"
            :class="
              scope.kind === 'dir' ? 'scope-header--dir' : 'scope-header--file'
            "
          >
            <h3 class="scope-header__title">
              <a
                v-if="scope.kind === 'file' && scopeOpenPath"
                href="#"
                class="scope-header__link"
                @click.prevent="openFile(scopeOpenPath)"
              >
                {{ scopeFileName }}
              </a>
              <template v-else>
                {{ scope.kind === "dir" ? `${scope.localPath}/` : scopeFileName }}
              </template>
            </h3>
            <p v-if="scopePresenceLabel" class="scope-header__presence">
              {{ scopePresenceLabel }}
            </p>
            <p v-if="scopeSummary" class="scope-header__summary">
              {{ scopeSummary }}
            </p>
            <p
              v-else-if="!scopeDocLoading"
              class="scope-header__hint"
            >
              {{ missingScopeHint }}
            </p>
          </header>
          <div v-else class="scope-header scope-header--all">
            <h3 class="scope-header__title">All modules</h3>
          </div>

          <p
            v-if="selectedModule?.loadableAsync"
            class="async-note"
          >
            Can be loaded <strong>async</strong>
          </p>

          <div v-if="showVueSurface" class="surface-block">
            <h4 class="surface-block__title">Component</h4>
            <table v-if="vueRootTag" class="surface-table">
              <tbody>
                <tr>
                  <th>root</th>
                  <td>
                    <code>&lt;{{ vueRootTag }}&gt;</code>
                  </td>
                </tr>
              </tbody>
            </table>
            <template v-if="vueModels.length">
              <h5 class="surface-block__subtitle">Models</h5>
              <table class="surface-table">
                <tbody>
                  <tr v-for="m in vueModels" :key="'model-' + m.name">
                    <th>{{ m.name }}</th>
                    <td>
                      <code v-if="m.signature">{{ m.signature }}</code>
                      <span v-if="m.docstring" class="surface-table__doc">{{
                        m.docstring
                      }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
            <template v-if="vueProps.length">
              <h5 class="surface-block__subtitle">Props</h5>
              <table class="surface-table">
                <tbody>
                  <tr v-for="p in vueProps" :key="'prop-' + p.name">
                    <th>{{ p.name }}</th>
                    <td>
                      <code v-if="p.signature">{{ p.signature }}</code>
                      <span v-if="p.docstring" class="surface-table__doc">{{
                        p.docstring
                      }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
            <template v-if="vueEmits.length">
              <h5 class="surface-block__subtitle">Emits</h5>
              <table class="surface-table">
                <tbody>
                  <tr v-for="e in vueEmits" :key="'emit-' + e.name">
                    <th>{{ e.name }}</th>
                    <td>
                      <code v-if="e.signature">{{ e.signature }}</code>
                      <span v-if="e.docstring" class="surface-table__doc">{{
                        e.docstring
                      }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>

          <div v-if="scopedRoutes.length" class="routes-block">
            <h4 class="routes-block__title">
              Loader routes
              <span class="routes-block__count">{{ scopedRoutes.length }}</span>
            </h4>
            <ul class="routes-block__list">
              <li
                v-for="op in scopedRoutes"
                :key="op.operationId + op.method + op.path"
              >
                <PackageRouteCard
                  :operation="normalizeOp(op)"
                  :route-repo-path="routeRepoPath(op.yamlPath)"
                  :open-file="openFile"
                  through-files
                />
              </li>
            </ul>
          </div>

          <TestTree
            v-if="specTree.length"
            :nodes="specTree"
            @open-source="openFile"
          />
          <p
            v-else-if="
              !showVueSurface &&
              !scopedRoutes.length &&
              !selectedModule?.loadableAsync
            "
            class="text-body-2 text-medium-emphasis"
          >
            No exports or tests in this scope.
          </p>
        </div>
      </template>
    </ResizableColumns>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCommitPackage, useScopeSummary } from "../requests/queries";
import {
  buildModuleFileNav,
  buildPackageSpecTree,
  findModuleNavNode,
  packageHasVueFiles,
  packageLocalPath,
  toModuleStem,
  toVueBundleStem,
  type TestScope,
} from "../test-tree";
import { scopeDocListPrefix } from "../scope-docs";
import { repoPathPrefix } from "../repo-paths";
import { openSource } from "../source-links";
import TestTree from "./TestTree.vue";
import TestFileNav from "./TestFileNav.vue";
import PackageRouteCard, {
  type RouteCardOperation,
} from "./PackageRouteCard.vue";
import ResizableColumns from "./ResizableColumns.vue";

const props = withDefaults(
  defineProps<{
    subdomain: string;
    commitHash: string;
    packageName: string;
    packageDirectory: string;
    productRoot?: string;
    githubRepo?: string;
    /** Branch/tag for GitHub links (default `main`). */
    githubRef?: string;
    localRepoRoot?: string;
    /** Controlled Spec scope (from checkout URL). */
    scope?: TestScope;
  }>(),
  {
    scope: () => ({ kind: "all" }),
  },
);

const emit = defineEmits<{
  "update:scope": [scope: TestScope];
}>();

const scope = computed(() => props.scope ?? { kind: "all" as const });

const setScope = (next: TestScope) => {
  emit("update:scope", next);
};

const { data, isLoading, error } = useCommitPackage(
  props.subdomain,
  () => props.commitHash,
  () => props.packageName,
);

const detail = computed(() => data.value?.packageDetail);

const pkgPrefix = computed(() =>
  repoPathPrefix(props.productRoot, props.packageDirectory),
);

const vueBundles = computed(() => {
  const d = detail.value;
  if (!d) return false;
  return packageHasVueFiles(d.exports ?? [], d.testCases, d.packageName);
});

const fileNav = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return buildModuleFileNav(
    d.exports ?? [],
    d.testCases,
    d.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
    { vueBundles: vueBundles.value },
  );
});

const selectedModule = computed(() => {
  if (scope.value.kind !== "file") return null;
  return findModuleNavNode(
    fileNav.value,
    scope.value.localPath,
    vueBundles.value,
  );
});

const scopeDocPrefix = computed(() =>
  scopeDocListPrefix({
    kind: scope.value.kind,
    pkgPrefix: pkgPrefix.value,
    localPath: scope.value.kind === "all" ? "" : scope.value.localPath,
    moduleStem:
      scope.value.kind === "file"
        ? vueBundles.value
          ? toVueBundleStem(scope.value.localPath)
          : toModuleStem(scope.value.localPath)
        : "",
  }),
);

const { summary: scopeSummary, isLoading: scopeDocLoading } = useScopeSummary(
  props.subdomain,
  () => ({
    ref: props.commitHash,
    prefix: scopeDocPrefix.value,
  }),
);

const missingScopeHint = computed(() => {
  if (scope.value.kind === "dir") {
    return "Add a README.md in this directory to describe what belongs here.";
  }
  if (scope.value.kind === "file") {
    return "Add a leading /** … */ on the source (or colocated test) to describe this module.";
  }
  return "";
});

const scopePresenceLabel = computed(() => {
  const mod = selectedModule.value;
  const p = mod?.presence;
  const bits: string[] = [];
  if (p === "both") bits.push("Source + colocated test");
  else if (p === "test") bits.push("Test only");
  else if (p === "source") bits.push("Source only");
  if (mod?.hasVueComponent) bits.push("Vue component");
  return bits.join(" · ");
});

const specTree = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return buildPackageSpecTree(
    d.exports ?? [],
    d.testCases,
    d.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
    scope.value,
    { vueBundles: vueBundles.value },
  );
});

const bundleExports = computed(() => {
  const d = detail.value;
  if (!d || !vueBundles.value || scope.value.kind === "all") return [];
  const s = scope.value;
  const wanted =
    s.kind === "file" ? toVueBundleStem(s.localPath) : s.localPath.replace(/\/+$/, "");
  return (d.exports ?? []).filter((e) => {
    const local = packageLocalPath(
      e.filePath,
      props.packageDirectory,
      props.productRoot ?? "",
    );
    const stem = toVueBundleStem(local);
    if (s.kind === "file") return stem === wanted;
    return stem === wanted || stem.startsWith(`${wanted}/`);
  });
});

const vueComponent = computed(() =>
  bundleExports.value.find(
    (e) => e.kind === "component" && !/Async\.vue$/i.test(e.filePath),
  ),
);
const vueRootTag = computed(() => {
  const sig = vueComponent.value?.signature;
  if (!sig || sig === "(vue component)") return null;
  return sig.replace(/^<|>$/g, "");
});
const vueModels = computed(() =>
  bundleExports.value.filter((e) => e.kind === "model"),
);
const vueProps = computed(() =>
  bundleExports.value.filter((e) => e.kind === "prop"),
);
const vueEmits = computed(() =>
  bundleExports.value.filter((e) => e.kind === "emit"),
);
const showVueSurface = computed(
  () =>
    Boolean(vueRootTag.value) ||
    vueModels.value.length > 0 ||
    vueProps.value.length > 0 ||
    vueEmits.value.length > 0,
);

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

interface SpecOperation {
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
}

const specPkgPrefix = computed(() => {
  const dir = detail.value?.specInventory?.packageDirectory as
    | string
    | undefined;
  if (!dir) return "";
  return repoPathPrefix(props.productRoot, dir);
});

const allOperations = computed((): SpecOperation[] => {
  const entities = detail.value?.specInventory?.entities ?? [];
  const ops: SpecOperation[] = [];
  for (const e of entities) {
    for (const op of e.operations ?? []) {
      ops.push(op as SpecOperation);
    }
  }
  return ops;
});

const scopedRoutes = computed(() => {
  if (!vueBundles.value || scope.value.kind === "all") return [] as SpecOperation[];
  const s = scope.value;
  const wanted =
    s.kind === "file"
      ? toVueBundleStem(s.localPath)
      : s.localPath.replace(/\/+$/, "");
  const pkg = detail.value?.packageName;
  const seen = new Set<string>();
  const out: SpecOperation[] = [];
  for (const op of allOperations.value) {
    const hit = (op.usedBy ?? []).some((u) => {
      if (pkg && u.packageName !== pkg) return false;
      const stem = toVueBundleStem(u.filePath);
      if (s.kind === "file") return stem === wanted;
      return stem === wanted || stem.startsWith(`${wanted}/`);
    });
    if (!hit) continue;
    const key = `${op.operationId}\0${op.method}\0${op.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(op);
  }
  return out.sort(
    (a, b) =>
      a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
});

function routeRepoPath(packageRelative: string): string {
  const prefix = specPkgPrefix.value;
  if (!prefix) return packageRelative;
  return `${prefix}/${packageRelative}`;
}

function normalizeOp(op: SpecOperation): RouteCardOperation {
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

const scopeFileName = computed(() => {
  if (scope.value.kind !== "file") return "";
  const stem = toModuleStem(scope.value.localPath);
  const parts = stem.split("/");
  return parts[parts.length - 1] ?? stem;
});

const scopeOpenPath = computed(() => {
  const mod = selectedModule.value;
  if (!mod) return "";
  return mod.sourceRepoPath || mod.testRepoPath || "";
});

const openFile = (path: string) => {
  openSource(path, {
    githubRef: props.githubRef,
    githubRepo: props.githubRepo,
    localRepoRoot: props.localRepoRoot,
  });
};
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
.scope-header {
  margin-bottom: 0.75rem;
  max-width: 44rem;
}
.scope-header__title {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  color: inherit;
}
.scope-header__link {
  color: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(var(--v-theme-on-surface), 0.25);
  user-select: text;
}
.scope-header--file .scope-header__title {
  font-size: 0.95rem;
}
.scope-header--dir .scope-header__title {
  font-size: 1.15rem;
}
.scope-header--all .scope-header__title {
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.scope-header__presence {
  margin: 0.25rem 0 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.scope-header__summary {
  margin: 0.4rem 0 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.scope-header--dir .scope-header__summary {
  font-size: 0.95rem;
}
.scope-header__hint {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.async-note {
  margin: 0 0 0.85rem;
  max-width: 44rem;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.surface-block,
.routes-block {
  margin-bottom: 1.1rem;
  max-width: 44rem;
}
.surface-block__title,
.routes-block__title {
  margin: 0 0 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.5);
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}
.surface-block__subtitle {
  margin: 0.7rem 0 0.35rem;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.routes-block__count {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.4);
}
.routes-block__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}
.surface-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.surface-table th {
  text-align: left;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  padding: 0.28rem 0.65rem 0.28rem 0;
  vertical-align: top;
  white-space: nowrap;
  width: 1%;
}
.surface-table td {
  padding: 0.28rem 0;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.surface-table code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.surface-table__doc {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
</style>
