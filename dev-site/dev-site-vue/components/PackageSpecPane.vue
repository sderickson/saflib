<template>
  <div>
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" class="mb-2">{{ error.message }}</v-alert>

    <div v-if="!isLoading && !fileNav.length" class="text-body-2 text-medium-emphasis">
      No test cases found for this package.
    </div>

    <div v-else-if="fileNav.length" class="spec-split">
      <aside class="spec-split__nav">
        <button
          type="button"
          class="spec-all"
          :class="{ 'spec-all--selected': scope.kind === 'all' }"
          @click="scope = { kind: 'all' }"
        >
          <v-icon size="x-small" icon="mdi-folder-outline" />
          <span>All tests</span>
        </button>
        <TestFileNav
          :nodes="fileNav"
          :selected="scope"
          @select="scope = $event"
        />
      </aside>

      <section class="spec-split__panel">
        <div class="text-caption text-medium-emphasis mb-2">
          {{ scopeLabel }}
        </div>
        <TestTree
          v-if="testTree.length"
          :nodes="testTree"
          @open-source="openFile"
        />
        <p v-else class="text-body-2 text-medium-emphasis">
          No suites in this scope.
        </p>

        <div v-if="scope.kind === 'all' && unlinkedExports.length" class="unlinked mt-6">
          <div class="text-caption text-medium-emphasis mb-2">
            Functions &amp; classes without a matching suite
          </div>
          <ul class="unlinked__list">
            <li
              v-for="exp in unlinkedExports"
              :key="`${exp.filePath}:${exp.name}:${exp.kind}`"
              class="unlinked__item"
            >
              <button
                type="button"
                class="unlinked__btn"
                @click="openFile(exp.filePath)"
              >
                <span class="unlinked__name">{{ exp.name }}</span>
                <span class="unlinked__kind">{{ exp.kind }}</span>
                <code v-if="exp.signature" class="unlinked__sig">{{
                  exp.signature
                }}</code>
              </button>
              <div v-if="exp.docstring" class="unlinked__doc">
                {{ exp.docstring }}
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useCommitPackage } from "../requests/queries";
import {
  buildPackageTestTree,
  buildTestFileNav,
  type TestScope,
} from "../test-tree";
import { openSource } from "../source-links";
import TestTree from "./TestTree.vue";
import TestFileNav from "./TestFileNav.vue";

const SPEC_EXPORT_KINDS = new Set(["function", "class"]);

const props = defineProps<{
  subdomain: string;
  commitHash: string;
  packageName: string;
  packageDirectory: string;
  productRoot?: string;
  githubRepo?: string;
  localRepoRoot?: string;
}>();

const scope = ref<TestScope>({ kind: "all" });

watch(
  () => props.packageName,
  () => {
    scope.value = { kind: "all" };
  },
);

const { data, isLoading, error } = useCommitPackage(
  props.subdomain,
  () => props.commitHash,
  () => props.packageName,
);

const detail = computed(() => data.value?.packageDetail);

const fileNav = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return buildTestFileNav(
    d.testCases,
    d.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
  );
});

const testTree = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return buildPackageTestTree(
    d.testCases,
    d.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
    scope.value,
  );
});

const scopeLabel = computed(() => {
  if (scope.value.kind === "all") return "All test files";
  if (scope.value.kind === "dir") return `${scope.value.localPath}/`;
  return scope.value.localPath;
});

const linkedSubjectNames = computed(() => {
  const names = new Set<string>();
  for (const t of detail.value?.testCases ?? []) {
    if (t.subjectName) names.add(t.subjectName);
  }
  return names;
});

const unlinkedExports = computed(() => {
  const linked = linkedSubjectNames.value;
  return (detail.value?.exports ?? [])
    .filter((e) => SPEC_EXPORT_KINDS.has(e.kind) && !linked.has(e.name))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
});

const openFile = (path: string) => {
  openSource(path, {
    commitHash: props.commitHash,
    githubRepo: props.githubRepo,
    localRepoRoot: props.localRepoRoot,
  });
};
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
  max-height: 60vh;
  overflow: auto;
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
.unlinked__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.unlinked__item {
  margin: 0.35rem 0 0.6rem;
}
.unlinked__btn {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
}
.unlinked__name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  font-size: 0.875rem;
}
.unlinked__kind {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.unlinked__sig {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-weight: 400;
}
.unlinked__doc {
  margin-top: 0.15rem;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 48rem;
}
</style>
