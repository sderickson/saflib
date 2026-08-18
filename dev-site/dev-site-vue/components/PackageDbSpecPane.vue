<template>
  <div class="pane-root">
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error.message }}</v-alert>

    <div
      v-if="!isLoading && !fileNav.length"
      class="text-body-2 text-medium-emphasis"
    >
      No schemas, queries, or other modules found for this package.
    </div>

    <ResizableColumns
      v-else-if="fileNav.length"
      class="pane-split"
      storage-key="dev-site.db.entityNavWidth"
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
            <span>All</span>
          </button>
          <TestFileNav
            :nodes="fileNav"
            :selected="scope"
            collapse-dirs-under="entities"
            @select="setScope"
          />
        </div>
      </template>
          <template #right>
        <div class="pane-panel">
          <template v-if="showEntityPanel">
            <div
              v-for="e in visibleEntities"
              :key="e.entity"
              class="entity-block"
            >
              <h3 class="entity-block__title">
                {{ e.entity }}
                <ChangeChip :change="e.change" />
              </h3>

              <div v-if="e.table" class="table-card">
                <div class="table-card__head">
                  <code class="table-card__name">{{ e.table.tableName }}</code>
                  <a
                    href="#"
                    class="table-card__file"
                    @click.prevent="openFile(e.table.filePath)"
                  >
                    {{ fileName(e.table.filePath) }}
                  </a>
                </div>
                <p v-if="e.table.docstring" class="table-card__doc">
                  {{ e.table.docstring }}
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
                <ul class="table-card__cols">
                  <li
                    v-for="c in e.table.columns"
                    :key="c.sqlName"
                    class="table-card__col"
                    :class="{
                      'table-card__col--added': c.change === 'added',
                      'table-card__col--removed': c.change === 'removed',
                      'table-card__col--modified': c.change === 'modified',
                    }"
                  >
                    <div class="table-card__col-main">
                      <code>{{ c.sqlName }}</code>
                      <span class="text-medium-emphasis">{{ c.typeKind }}</span>
                      <ChangeChip :change="c.change" />
                    </div>
                    <p v-if="c.docstring" class="table-card__col-doc">
                      {{ c.docstring }}
                    </p>
                  </li>
                </ul>
              </div>
              <template v-else>
                <p class="text-body-2 text-medium-emphasis mb-2">
                  No matching drizzle table for this query directory.
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

              <TestTree
                v-if="specCardsFor(e).length"
                :nodes="specCardsFor(e)"
                @open-source="openFile"
              />
              <p
                v-else-if="!e.queries.length"
                class="text-body-2 text-medium-emphasis"
              >
                No queries or tests for this entity.
              </p>
            </div>
            <p
              v-if="!visibleEntities.length"
              class="text-body-2 text-medium-emphasis"
            >
              No entities in this scope.
            </p>
          </template>

          <template v-if="showModulePanel">
            <header
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

            <TestTree
              v-if="moduleSpecTree.length"
              :nodes="moduleSpecTree"
              @open-source="openFile"
            />
            <p v-else class="text-body-2 text-medium-emphasis">
              No exports or tests in this scope.
            </p>
          </template>
        </div>
      </template>
    </ResizableColumns>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useScopeSummary } from "../requests/queries.ts";
import { useComparedPackageDetail } from "../package-compare.ts";
import {
  buildDbPackageFileNav,
  buildPackageSpecTree,
  buildPackageTestTree,
  dbEntitySelectionFromScope,
  findModuleNavNode,
  isDbPackageHiddenModuleStem,
  toModuleStem,
  type TestScope,
  type TestTreeNode,
} from "../test-tree.ts";
import {
  dbColumnKey,
  exportIdentityKey,
  filterFileNav,
  pickChangedItems,
  pruneEmptySpecTree,
  tagSpecTree,
  testIdentityKey,
  unionByKey,
} from "../package-change-overlay.ts";
import { scopeDocListPrefix } from "../scope-docs.ts";
import { repoPathPrefix } from "../repo-paths.ts";
import { openSource } from "../source-links.ts";
import ResizableColumns from "./ResizableColumns.vue";
import TestFileNav from "./TestFileNav.vue";
import TestTree from "./TestTree.vue";
import ChangeChip from "./ChangeChip.vue";

interface DbQuery {
  fileName: string;
  filePath: string;
  exportName?: string | null;
  signature?: string | null;
  docstring?: string | null;
  usedBy: Array<{
    packageName: string;
    filePath: string;
    repoPath: string;
  }>;
}

interface DbEntity {
  entity: string;
  table: {
    tableName: string;
    filePath: string;
    docstring?: string | null;
    columns: Array<{
      sqlName: string;
      typeKind: string;
      docstring?: string | null;
      change?: "added" | "removed" | "modified";
    }>;
  } | null;
  usedByPackages: string[];
  queries: DbQuery[];
  change?: "added" | "removed" | "modified";
}

const props = withDefaults(
  defineProps<{
    subdomain: string;
    commitHash: string;
    compareFromHash?: string;
    packageName: string;
    packageDirectory: string;
    productRoot: string;
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
    productRoot: () => props.productRoot,
  },
);

const allExports = computed(() =>
  unionByKey(
    beforeDetail.value?.exports ?? [],
    afterDetail.value?.exports ?? detail.value?.exports ?? [],
    exportIdentityKey,
  ),
);
const allTests = computed(() =>
  unionByKey(
    beforeDetail.value?.testCases ?? [],
    afterDetail.value?.testCases ?? detail.value?.testCases ?? [],
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
    beforeDetail.value?.testCases ?? [],
    afterDetail.value?.testCases ?? [],
    testIdentityKey,
    overlay.value.tests,
  );
});

const rawEntities = computed(() => {
  const before = (beforeDetail.value?.dbInventory?.entities ?? []) as DbEntity[];
  const after = (afterDetail.value?.dbInventory?.entities ??
    detail.value?.dbInventory?.entities ??
    []) as DbEntity[];
  return { before, after };
});

const entities = computed(() => {
  const { before, after } = rawEntities.value;
  if (!overlay.value) return unionByKey(before, after, (e) => e.entity);
  return pickChangedItems(
    before,
    after,
    (e) => e.entity,
    overlay.value.dbEntities,
  ).map((entity) => {
    const b = before.find((e) => e.entity === entity.entity);
    const a = after.find((e) => e.entity === entity.entity);
    const beforeCols = b?.table?.columns ?? [];
    const afterCols = a?.table?.columns ?? [];
    const columns = pickChangedItems(
      beforeCols,
      afterCols,
      (c) => dbColumnKey(entity.entity, c.sqlName),
      overlay.value!.dbColumns,
    );
    return {
      ...entity,
      table: entity.table ? { ...entity.table, columns } : entity.table,
    };
  });
});

const entitySelection = computed(() =>
  dbEntitySelectionFromScope(scope.value),
);

/** `all` defaults to the entity inventory (db specialty); other modules via nav. */
const showEntityPanel = computed(
  () => scope.value.kind === "all" || entitySelection.value !== undefined,
);

const showModulePanel = computed(
  () => scope.value.kind !== "all" && entitySelection.value === undefined,
);

const visibleEntities = computed(() => {
  if (!showEntityPanel.value) return [];
  const sel = entitySelection.value;
  if (scope.value.kind === "all" || sel === null) return entities.value;
  if (typeof sel === "string") {
    return entities.value.filter((e) => e.entity === sel);
  }
  return [];
});

const fileNav = computed(() => {
  const nav = buildDbPackageFileNav(
    entities.value.map((e) => e.entity),
    allExports.value,
    allTests.value,
    props.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
  );
  if (!overlay.value) return nav;
  return filterFileNav(nav, overlay.value.modules);
});

const pkgPrefix = computed(() =>
  repoPathPrefix(props.productRoot, props.packageDirectory),
);

const selectedModule = computed(() => {
  if (scope.value.kind !== "file") return null;
  if (entitySelection.value !== undefined) return null;
  return findModuleNavNode(fileNav.value, scope.value.localPath);
});

const scopeDocPrefix = computed(() => {
  if (entitySelection.value !== undefined) return "";
  return scopeDocListPrefix({
    kind: scope.value.kind,
    pkgPrefix: pkgPrefix.value,
    localPath: scope.value.kind === "all" ? "" : scope.value.localPath,
    moduleStem:
      scope.value.kind === "file"
        ? toModuleStem(scope.value.localPath)
        : "",
  });
});

const { summary: scopeSummary, isLoading: scopeDocLoading } = useScopeSummary(
  props.subdomain,
  () => ({
    ref:
      overlay.value &&
      scope.value.kind === "file" &&
      overlay.value.modules[toModuleStem(scope.value.localPath)] === "removed"
        ? (props.compareFromHash ?? props.commitHash)
        : props.commitHash,
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

const moduleSpecTree = computed(() => {
  if (!showModulePanel.value) return [];
  const tree = buildPackageSpecTree(
    specExports.value,
    specTests.value,
    props.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
    scope.value,
    { excludeStem: isDbPackageHiddenModuleStem },
  );
  if (!overlay.value) return tree;
  return pruneEmptySpecTree(tagSpecTree(tree, overlay.value));
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

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

function stem(fileName: string): string {
  return fileName.replace(/\.ts$/, "");
}

function walkSuites(nodes: TestTreeNode[], out: TestTreeNode[] = []): TestTreeNode[] {
  for (const n of nodes) {
    if (n.kind === "suite") out.push(n);
    if (n.children.length) walkSuites(n.children, out);
  }
  return out;
}

function walkFiles(nodes: TestTreeNode[], out: TestTreeNode[] = []): TestTreeNode[] {
  for (const n of nodes) {
    if (n.kind === "file") out.push(n);
    if (n.children.length) walkFiles(n.children, out);
  }
  return out;
}

function queryMatchesSuite(q: DbQuery, suite: TestTreeNode): boolean {
  if (q.exportName && suite.subjectName === q.exportName) return true;
  if (q.filePath && suite.subjectFilePath === q.filePath) return true;
  if (q.exportName && suite.label === q.exportName) return true;
  return false;
}

function queryMatchesTestFile(q: DbQuery, fileNode: TestTreeNode): boolean {
  const path = fileNode.sourcePath ?? "";
  const expected = q.filePath.replace(/\.ts$/, ".test.ts");
  if (path === expected) return true;
  const base = stem(q.fileName);
  return (
    fileNode.label === `${base}.test.ts` ||
    path.endsWith(`/${base}.test.ts`)
  );
}

/**
 * Merge query inventory into suite cards: one card per query/suite with
 * signature + docstring + importers + tests. Orphan queries (no suite) become
 * suite-shaped cards; orphan suites keep their own cards.
 */
function specCardsFor(entity: DbEntity): TestTreeNode[] {
  const cases = specTests.value.filter((t) => {
    const needle = `/queries/${entity.entity}/`;
    return (
      t.filePath.includes(needle) ||
      t.filePath.includes(`queries/${entity.entity}/`)
    );
  });
  const testTree = buildPackageTestTree(
    cases,
    props.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
  );

  const suites = walkSuites(testTree);
  const files = walkFiles(testTree);
  const matchedSuiteIds = new Set<string>();
  const cards: TestTreeNode[] = [];

  for (const q of entity.queries) {
    let suite =
      suites.find((s) => queryMatchesSuite(q, s)) ??
      null;

    if (!suite) {
      const file = files.find((f) => queryMatchesTestFile(q, f));
      if (file) {
        suite =
          (q.exportName
            ? file.children.find(
                (c) => c.kind === "suite" && c.label === q.exportName,
              )
            : undefined) ??
          file.children.find((c) => c.kind === "suite") ??
          null;
      }
    }

    if (suite) {
      matchedSuiteIds.add(suite.id);
      cards.push({
        ...suite,
        subjectName: suite.subjectName ?? q.exportName,
        subjectSignature: suite.subjectSignature ?? q.signature,
        subjectDocstring: suite.subjectDocstring ?? q.docstring,
        subjectFilePath: suite.subjectFilePath ?? q.filePath,
        usedBy: q.usedBy.length ? q.usedBy : suite.usedBy ?? null,
      });
    } else {
      cards.push({
        id: `query:${q.filePath}`,
        label: q.exportName ?? q.fileName,
        kind: "suite",
        children: [],
        subjectName: q.exportName,
        subjectSignature: q.signature,
        subjectDocstring: q.docstring,
        subjectFilePath: q.filePath,
        usedBy: q.usedBy.length ? q.usedBy : null,
      });
    }
  }

  for (const suite of suites) {
    if (matchedSuiteIds.has(suite.id)) continue;
    cards.push(suite);
  }

  return overlay.value
    ? pruneEmptySpecTree(tagSpecTree(cards, overlay.value))
    : cards;
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
.entity-block {
  margin-bottom: 1.75rem;
}
.entity-block__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
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
.table-card__col--added {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-success));
  padding-left: 0.5rem;
}
.table-card__col--removed {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-error));
  padding-left: 0.5rem;
}
.table-card__col--modified {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-warning));
  padding-left: 0.5rem;
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
</style>
