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
      storage-key="dev-site.http.moduleNavWidth"
      :default-left="180"
      :min-left="120"
      :max-left="320"
    >
      <template #left>
        <div class="pane-nav">
          <TestFileNav
            :nodes="fileNav"
            :selected="scope"
            collapse-dirs-under="handlers"
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
          <p
            v-else
            class="text-body-2 text-medium-emphasis mb-3"
          >
            Select a module in the nav.
          </p>

          <div v-if="scopedRoutes.length" class="routes-block">
            <h4 class="routes-block__title">
              Routes
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
                />
              </li>
            </ul>
          </div>
          <p
            v-else-if="handlersScope && !isLoading"
            class="text-body-2 text-medium-emphasis mb-3"
          >
            No joined OpenAPI routes for this handler scope (sibling
            <code>-spec</code> package).
          </p>

          <TestTree
            v-if="specTree.length"
            :nodes="specTree"
            @open-source="openFile"
          />
          <p
            v-else-if="scope.kind !== 'all' && !scopedRoutes.length"
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
import { computed, watch } from "vue";
import { useCommitPackage, useFirstRepoFile } from "../requests/queries";
import {
  buildModuleFileNav,
  buildPackageSpecTree,
  findModuleNavNode,
  toModuleStem,
  type TestFileNavNode,
  type TestScope,
} from "../test-tree";
import {
  extractLeadingJsDocProse,
  fileScopeDocCandidates,
  shortenMarkdownSummary,
} from "../scope-docs";
import { repoPathPrefix } from "../repo-paths";
import { openSource } from "../source-links";
import TestTree from "./TestTree.vue";
import TestFileNav from "./TestFileNav.vue";
import PackageRouteCard, {
  type RouteCardOperation,
} from "./PackageRouteCard.vue";
import ResizableColumns from "./ResizableColumns.vue";

interface SpecFileRef {
  filePath: string;
  repoPath: string;
}

interface SpecTestSpec {
  fullName: string;
}

interface SpecUsedBy {
  packageName: string;
  filePath: string;
  repoPath: string;
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
  handlerTests?: SpecTestSpec[];
  requestSchemas: string[];
  responseSchemas: string[];
  usedBy: SpecUsedBy[];
}

const props = withDefaults(
  defineProps<{
    subdomain: string;
    commitHash: string;
    packageName: string;
    packageDirectory: string;
    productRoot?: string;
    githubRepo?: string;
    githubRef?: string;
    localRepoRoot?: string;
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

const specPkgPrefix = computed(() => {
  const dir = detail.value?.specInventory?.packageDirectory as
    | string
    | undefined;
  if (!dir) return "";
  return repoPathPrefix(props.productRoot, dir);
});

const fileNav = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return pruneEmptyIndexModules(
    buildModuleFileNav(
      d.exports ?? [],
      d.testCases,
      d.packageName,
      props.packageDirectory,
      props.productRoot ?? "",
    ),
  );
});

/** Prefer `handlers/` when landing with no selection. */
watch(
  fileNav,
  (nodes) => {
    if (scope.value.kind !== "all" || !nodes.length) return;
    const handlers = nodes.find(
      (n) => n.kind === "dir" && n.localPath === "handlers",
    );
    const first = handlers ?? nodes[0];
    if (first) {
      setScope({ kind: first.kind, localPath: first.localPath });
    }
  },
  { immediate: true },
);

/** Drop `index` leaves with no function/class/const exports (empty router barrels). */
function pruneEmptyIndexModules(nodes: TestFileNavNode[]): TestFileNavNode[] {
  return nodes
    .map((n) =>
      n.kind === "dir"
        ? { ...n, children: pruneEmptyIndexModules(n.children) }
        : n,
    )
    .filter((n) => {
      if (n.kind === "dir") return n.children.length > 0;
      if (n.label === "index" && !n.hasCardExports) return false;
      return true;
    });
}

const selectedModule = computed(() => {
  if (scope.value.kind !== "file") return null;
  return findModuleNavNode(fileNav.value, scope.value.localPath);
});

const scopeDocPaths = computed(() => {
  const prefix = pkgPrefix.value;
  const s = scope.value;
  if (s.kind === "all") return [] as string[];
  if (s.kind === "dir") {
    const base = [prefix, s.localPath].filter(Boolean).join("/");
    return [`${base}/README.md`, `${base}/readme.md`];
  }
  const stemRepo = [prefix, toModuleStem(s.localPath)].filter(Boolean).join("/");
  return fileScopeDocCandidates(stemRepo);
});

const {
  data: scopeDocFile,
  isLoading: scopeDocLoading,
} = useFirstRepoFile(props.subdomain, () => ({
  ref: props.commitHash,
  paths: scopeDocPaths.value,
}));

const scopeSummary = computed(() => {
  const file = scopeDocFile.value;
  if (!file?.content) return null;
  if (file.path.toLowerCase().endsWith(".md")) {
    return shortenMarkdownSummary(file.content);
  }
  return extractLeadingJsDocProse(file.content);
});

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
  const p = selectedModule.value?.presence;
  if (p === "both") return "Source + colocated test";
  if (p === "test") return "Test only";
  if (p === "source") return "Source only";
  return "";
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
  );
});

const allOperations = computed((): SpecOperation[] => {
  const entities = detail.value?.specInventory?.entities ?? [];
  const ops: SpecOperation[] = [];
  for (const e of entities) {
    for (const op of e.operations ?? []) {
      ops.push(op as SpecOperation);
    }
  }
  return ops.sort((a, b) => {
    const ha = a.handler?.filePath ?? a.routeStem ?? a.path;
    const hb = b.handler?.filePath ?? b.routeStem ?? b.path;
    return (
      ha.localeCompare(hb) ||
      a.method.localeCompare(b.method) ||
      a.operationId.localeCompare(b.operationId)
    );
  });
});

const handlersScope = computed(() => {
  const s = scope.value;
  if (s.kind === "all") return false;
  return s.localPath === "handlers" || s.localPath.startsWith("handlers/");
});

function handlerMatchesScope(
  handlerPath: string | undefined,
  s: TestScope,
): boolean {
  if (s.kind === "all") return false;
  if (!handlerPath) return false;
  const stem = toModuleStem(s.localPath);
  const handlerStem = toModuleStem(handlerPath);
  if (s.kind === "file") {
    return handlerStem === stem || handlerPath === s.localPath;
  }
  return (
    handlerPath === s.localPath ||
    handlerPath.startsWith(`${s.localPath}/`) ||
    handlerStem === s.localPath ||
    handlerStem.startsWith(`${s.localPath}/`)
  );
}

const scopedRoutes = computed(() => {
  if (!handlersScope.value) return [] as SpecOperation[];
  return allOperations.value.filter((op) =>
    handlerMatchesScope(op.handler?.filePath, scope.value),
  );
});

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
    handlerTests: op.handlerTests ?? [],
    requestSchemas: op.requestSchemas,
    responseSchemas: op.responseSchemas,
    usedBy: op.usedBy ?? [],
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
.routes-block {
  margin-bottom: 1.25rem;
}
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
</style>
