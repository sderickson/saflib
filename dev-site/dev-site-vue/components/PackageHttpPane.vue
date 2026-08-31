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
                :key="op.operation_id + op.method + op.path"
                :class="{
                  'routes-block__item--added': op.change === 'added',
                  'routes-block__item--removed': op.change === 'removed',
                  'routes-block__item--modified': op.change === 'modified',
                }"
              >
                <ChangeChip :change="op.change" />
                <PackageRouteCard
                  :operation="normalizeOp(op)"
                  :route-repo-path="routeRepoPath(op.yaml_path)"
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
import { useScopeSummary } from "../requests/queries";
import { useComparedPackageDetail } from "../package-compare";
import {
  buildModuleFileNav,
  buildPackageSpecTree,
  findModuleNavNode,
  toModuleStem,
  type TestFileNavNode,
  type TestScope,
} from "../test-tree";
import {
  exportIdentityKey,
  filterFileNav,
  pickChangedItems,
  pruneEmptySpecTree,
  specOperationKey,
  tagSpecTree,
  testIdentityKey,
  unionByKey,
  type PathRename,
} from "../package-change-overlay";
import { scopeDocListPrefix } from "../scope-docs";
import { repoPathPrefix } from "../repo-paths";
import { openSource } from "../source-links";
import TestTree from "./TestTree.vue";
import TestFileNav from "./TestFileNav.vue";
import PackageRouteCard, {
  type RouteCardOperation,
} from "./PackageRouteCard.vue";
import ResizableColumns from "./ResizableColumns.vue";
import ChangeChip from "./ChangeChip.vue";

interface SpecFileRef {
  file_path: string;
  repo_path: string;
}

interface SpecTestSpec {
  full_name: string;
}

interface SpecUsedBy {
  package_name: string;
  file_path: string;
  repo_path: string;
}

interface SpecOperation {
  operation_id: string;
  method: string;
  path: string;
  summary?: string | null;
  tags?: string[];
  yaml_path: string;
  route_stem?: string | null;
  handler?: SpecFileRef | null;
  request?: SpecFileRef | null;
  fake?: SpecFileRef | null;
  handler_tests?: SpecTestSpec[];
  request_schemas: string[];
  response_schemas: string[];
  used_by: SpecUsedBy[];
  enqueues?: string[];
  enqueued_by?: string[];
  change?: "added" | "removed" | "modified";
}

const props = withDefaults(
  defineProps<{
    subdomain: string;
    commitHash: string;
    compareFromHash?: string;
    pathRenames?: PathRename[];
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

const {
  isLoading,
  error,
  overlay,
  detail,
  beforeDetail,
  afterDetail,
} = useComparedPackageDetail(
  props.subdomain,
  () => props.commitHash,
  () => props.packageName,
  {
    compareFromHash: () => props.compareFromHash,
    product_root: () => props.productRoot,
    pathRenames: () => props.pathRenames,
  },
);

const pkgPrefix = computed(() =>
  repoPathPrefix(props.productRoot, props.packageDirectory),
);

const specPkgPrefix = computed(() => {
  const dir = (
    afterDetail.value?.spec_inventory ??
    beforeDetail.value?.spec_inventory ??
    detail.value?.spec_inventory
  )?.package_directory as string | undefined;
  if (!dir) return "";
  return repoPathPrefix(props.productRoot, dir);
});

const allExports = computed(() =>
  unionByKey(
    beforeDetail.value?.exports ?? [],
    afterDetail.value?.exports ?? detail.value?.exports ?? [],
    exportIdentityKey,
  ),
);
const allTests = computed(() =>
  unionByKey(
    beforeDetail.value?.test_cases ?? [],
    afterDetail.value?.test_cases ?? detail.value?.test_cases ?? [],
    testIdentityKey,
  ),
);
const specExports = computed(() => {
  if (!overlay.value) return allExports.value;
  return pickChangedItems(
    beforeDetail.value?.exports ?? [],
    afterDetail.value?.exports ?? [],
    exportIdentityKey,
    overlay.value.exports,
  );
});
const specTests = computed(() => {
  if (!overlay.value) return allTests.value;
  return pickChangedItems(
    beforeDetail.value?.test_cases ?? [],
    afterDetail.value?.test_cases ?? [],
    testIdentityKey,
    overlay.value.tests,
  );
});

const fileNav = computed(() => {
  const nav = pruneEmptyIndexModules(
    buildModuleFileNav(
      allExports.value,
      allTests.value,
      props.packageName,
      props.packageDirectory,
      props.productRoot ?? "",
    ),
  );
  if (!overlay.value) return nav;
  return filterFileNav(nav, overlay.value.modules, overlay.value.movedFrom);
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

const scopeDocPrefix = computed(() =>
  scopeDocListPrefix({
    kind: scope.value.kind,
    pkgPrefix: pkgPrefix.value,
    localPath: scope.value.kind === "all" ? "" : scope.value.localPath,
    moduleStem:
      scope.value.kind === "file"
        ? toModuleStem(scope.value.localPath)
        : "",
  }),
);

const scopeDocRef = computed(() => {
  if (!overlay.value || scope.value.kind !== "file") return props.commitHash;
  const stem = toModuleStem(scope.value.localPath);
  return overlay.value.modules[stem] === "removed"
    ? (props.compareFromHash ?? props.commitHash)
    : props.commitHash;
});

const { summary: scopeSummary, isLoading: scopeDocLoading } = useScopeSummary(
  props.subdomain,
  () => ({
    ref: scopeDocRef.value,
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
  const p = selectedModule.value?.presence;
  if (p === "both") return "Source + colocated test";
  if (p === "test") return "Test only";
  if (p === "source") return "Source only";
  return "";
});

const specTree = computed(() => {
  const tree = buildPackageSpecTree(
    specExports.value,
    specTests.value,
    props.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
    scope.value,
  );
  if (!overlay.value) return tree;
  return pruneEmptySpecTree(tagSpecTree(tree, overlay.value));
});

const allOperations = computed((): SpecOperation[] => {
  const beforeOps: SpecOperation[] = [];
  const afterOps: SpecOperation[] = [];
  for (const e of beforeDetail.value?.spec_inventory?.entities ?? []) {
    for (const op of e.operations ?? []) beforeOps.push(op as SpecOperation);
  }
  for (const e of afterDetail.value?.spec_inventory?.entities ??
    detail.value?.spec_inventory?.entities ??
    []) {
    for (const op of e.operations ?? []) afterOps.push(op as SpecOperation);
  }
  const merged = overlay.value
    ? pickChangedItems(
        beforeOps,
        afterOps,
        specOperationKey,
        overlay.value.specOperations,
      )
    : unionByKey(beforeOps, afterOps, specOperationKey);
  return merged.sort((a, b) => {
    const ha = a.handler?.file_path ?? a.route_stem ?? a.path;
    const hb = b.handler?.file_path ?? b.route_stem ?? b.path;
    return (
      ha.localeCompare(hb) ||
      a.method.localeCompare(b.method) ||
      a.operation_id.localeCompare(b.operation_id)
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
    handlerMatchesScope(op.handler?.file_path, scope.value),
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
    operation_id: op.operation_id,
    method: op.method,
    path: op.path,
    summary: op.summary,
    tags: op.tags ?? [],
    yaml_path: op.yaml_path,
    route_stem: op.route_stem ?? null,
    handler: op.handler ?? null,
    request: op.request ?? null,
    fake: op.fake ?? null,
    handler_tests: op.handler_tests ?? [],
    request_schemas: op.request_schemas,
    response_schemas: op.response_schemas,
    used_by: op.used_by ?? [],
    enqueues: op.enqueues,
    enqueued_by: op.enqueued_by,
  };
}

function openFile(path: string) {
  openSource(path, {
    githubRef: props.githubRef,
    github_repo: props.githubRepo,
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
.routes-block__item--added,
.routes-block__item--removed,
.routes-block__item--modified {
  display: grid;
  gap: 0.35rem;
  padding-left: 0.5rem;
}
.routes-block__item--added {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-success));
}
.routes-block__item--removed {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-error));
}
.routes-block__item--modified {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-warning));
}
</style>
