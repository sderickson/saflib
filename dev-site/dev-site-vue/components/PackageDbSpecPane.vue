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
          <v-icon size="x-small" icon="mdi-folder-outline" />
          <span>All entities</span>
        </button>
        <button
          v-for="e in entities"
          :key="e.entity"
          type="button"
          class="entity-nav"
          :class="{ 'entity-nav--selected': selectedEntity === e.entity }"
          @click="selectedEntity = e.entity"
        >
          <v-icon size="x-small" icon="mdi-table" />
          <span>{{ e.entity }}</span>
        </button>
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
          <p v-else class="text-body-2 text-medium-emphasis mb-3">
            No matching drizzle table for this query directory.
          </p>

          <div v-if="testsFor(e.entity).length" class="entity-tests">
            <div class="text-caption text-medium-emphasis mb-1">Tests</div>
            <TestTree
              :nodes="testsFor(e.entity)"
              @open-source="openFile"
            />
          </div>
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
const entities = computed(() => detail.value?.dbInventory?.entities ?? []);

const visibleEntities = computed(() => {
  if (selectedEntity.value == null) return entities.value;
  return entities.value.filter((e) => e.entity === selectedEntity.value);
});

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

function testsFor(entity: string): TestTreeNode[] {
  const cases = (detail.value?.testCases ?? []).filter((t) => {
    const needle = `/queries/${entity}/`;
    return (
      t.filePath.includes(needle) ||
      t.filePath.includes(`queries/${entity}/`)
    );
  });
  return buildPackageTestTree(
    cases,
    props.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
  );
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
.spec-split__nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  position: sticky;
  top: 0.5rem;
  max-height: calc(100vh - 8rem);
  overflow: auto;
}
.spec-all,
.entity-nav {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.spec-all--selected,
.entity-nav--selected {
  background: rgba(var(--v-theme-primary), 0.12);
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
  margin: 0 0 0.65rem;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
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
