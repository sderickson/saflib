<template>
  <div>
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" class="mb-2">{{ error.message }}</v-alert>

    <div v-if="!isLoading && !fileNav.length" class="text-body-2 text-medium-emphasis">
      No source or test modules found for this package.
    </div>

    <div v-else-if="fileNav.length" class="spec-split">
      <aside class="spec-split__nav">
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
          @select="setScope"
        />
      </aside>

      <section class="spec-split__panel">
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
        <p
          v-else-if="scope.kind === 'all' && allRouteCount > 0"
          class="routes-hint"
        >
          {{ allRouteCount }} routes under
          <code>handlers/</code> — open that folder to browse route cards.
        </p>

        <TestTree
          v-if="specTree.length"
          :nodes="specTree"
          @open-source="openFile"
        />
        <p
          v-else-if="!scopedRoutes.length"
          class="text-body-2 text-medium-emphasis"
        >
          No exports or tests in this scope.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCommitPackage, useFirstRepoFile } from "../requests/queries";
import {
  buildModuleFileNav,
  buildPackageSpecTree,
  findModuleNavNode,
  toModuleStem,
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
  return buildModuleFileNav(
    d.exports ?? [],
    d.testCases,
    d.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
  );
});

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

const allRouteCount = computed(() => allOperations.value.length);

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
.spec-split {
  display: grid;
  grid-template-columns: minmax(10rem, 14rem) 1fr;
  gap: 1rem;
  align-items: start;
}
@media (max-width: 720px) {
  .spec-split {
    grid-template-columns: 1fr;
  }
}
.spec-split__nav {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 6px;
  padding: 0.5rem 0.35rem;
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
.spec-split__panel {
  min-width: 0;
}
.scope-header {
  margin-bottom: 1rem;
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
.routes-hint {
  margin: 0 0 1rem;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
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
