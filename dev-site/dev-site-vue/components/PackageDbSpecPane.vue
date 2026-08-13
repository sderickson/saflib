<template>
  <div>
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" class="mb-2">{{ error.message }}</v-alert>

    <div
      v-if="!isLoading && !entities.length"
      class="text-body-2 text-medium-emphasis"
    >
      No schemas or query directories found for this package.
    </div>

    <div v-else-if="entities.length" class="spec-split">
      <aside class="spec-split__nav">
        <button
          type="button"
          class="spec-all"
          :class="{ 'spec-all--selected': selectedEntity === null }"
          @click="selectedEntity = null"
        >
          <v-icon size="x-small" icon="mdi-folder-outline" class="entity-nav__icon" />
          <span>All entities</span>
        </button>
        <ul class="entity-nav">
          <li v-for="e in entities" :key="e.entity" class="entity-nav__item">
            <button
              type="button"
              class="entity-nav__row"
              :class="{ 'entity-nav__row--selected': selectedEntity === e.entity }"
              @click="selectedEntity = e.entity"
            >
              <v-icon
                size="x-small"
                :icon="e.table ? 'mdi-table' : 'mdi-file-outline'"
                class="entity-nav__icon"
              />
              <span class="entity-nav__label">{{ e.entity }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <section class="spec-split__panel">
        <div
          v-for="e in visibleEntities"
          :key="e.entity"
          class="entity-block"
        >
          <h3 class="entity-block__title">{{ e.entity }}</h3>

          <div v-if="e.table" class="table-card">
            <div class="table-card__head">
              <code class="table-card__name">{{ e.table.tableName }}</code>
              <button
                type="button"
                class="table-card__file"
                @click="openFile(e.table.filePath)"
              >
                {{ fileName(e.table.filePath) }}
              </button>
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
              >
                <div class="table-card__col-main">
                  <code>{{ c.sqlName }}</code>
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
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useCommitPackage } from "../requests/queries.ts";
import {
  buildPackageTestTree,
  type TestTreeNode,
} from "../test-tree.ts";
import { openSource } from "../source-links.ts";
import TestTree from "./TestTree.vue";

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
    }>;
  } | null;
  usedByPackages: string[];
  queries: DbQuery[];
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

const selectedEntity = ref<string | null>(null);

const { data, isLoading, error } = useCommitPackage(
  props.subdomain,
  () => props.commitHash,
  () => props.packageName,
);

const detail = computed(() => data.value?.packageDetail);
const entities = computed(
  () => (detail.value?.dbInventory?.entities ?? []) as DbEntity[],
);

const visibleEntities = computed(() => {
  if (selectedEntity.value == null) return entities.value;
  return entities.value.filter((e) => e.entity === selectedEntity.value);
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
  const cases = (detail.value?.testCases ?? []).filter((t) => {
    const needle = `/queries/${entity.entity}/`;
    return (
      t.filePath.includes(needle) ||
      t.filePath.includes(`queries/${entity.entity}/`)
    );
  });
  const tree = buildPackageTestTree(
    cases,
    props.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
  );

  const suites = walkSuites(tree);
  const files = walkFiles(tree);
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

  // Suites not claimed by a query (helpers, cross-cutting tests).
  for (const suite of suites) {
    if (matchedSuiteIds.has(suite.id)) continue;
    cards.push(suite);
  }

  return cards;
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
  grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
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
.spec-split__panel {
  min-width: 0;
}
.entity-block {
  margin-bottom: 1.75rem;
}
.entity-block__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
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
  border: none;
  background: none;
  padding: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
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
</style>
