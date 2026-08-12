<template>
  <div>
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" class="mb-2">{{ error.message }}</v-alert>

    <TestTree
      v-if="testTree.length"
      :nodes="testTree"
      @open-source="openFile"
    />
    <p
      v-else-if="!isLoading"
      class="text-body-2 text-medium-emphasis"
    >
      No test cases found for this package.
    </p>

    <div v-if="unlinkedExports.length" class="unlinked mt-6">
      <div class="text-caption text-medium-emphasis mb-2">
        Exports without a matching suite
      </div>
      <ul class="unlinked__list">
        <li
          v-for="exp in unlinkedExports"
          :key="`${exp.filePath}:${exp.name}:${exp.kind}`"
          class="unlinked__item"
        >
          <button type="button" class="unlinked__btn" @click="openFile(exp.filePath)">
            <span class="unlinked__name">{{ exp.name }}</span>
            <span class="unlinked__kind">{{ exp.kind }}</span>
            <code v-if="exp.signature" class="unlinked__sig">{{
              exp.signature
            }}</code>
          </button>
          <div v-if="exp.docstring" class="unlinked__doc">{{ exp.docstring }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCommitPackage } from "../requests/queries";
import { buildPackageTestTree } from "../test-tree";
import { openSource } from "../source-links";
import TestTree from "./TestTree.vue";

const props = defineProps<{
  subdomain: string;
  commitHash: string;
  packageName: string;
  packageDirectory: string;
  productRoot?: string;
  githubRepo?: string;
  localRepoRoot?: string;
}>();

const { data, isLoading, error } = useCommitPackage(
  props.subdomain,
  () => props.commitHash,
  () => props.packageName,
);

const detail = computed(() => data.value?.packageDetail);

const testTree = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return buildPackageTestTree(
    d.testCases,
    d.packageName,
    props.packageDirectory,
    props.productRoot ?? "",
  );
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
    .filter((e) => !linked.has(e.name))
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
