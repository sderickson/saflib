<template>
  <div>
    <v-progress-linear v-if="isLoading" indeterminate class="mb-2" />
    <v-alert v-if="error" type="error" class="mb-2">{{ error.message }}</v-alert>

    <div v-if="!grouped.length && !isLoading" class="text-body-2 text-medium-emphasis">
      No exports found for this package.
    </div>

    <div v-for="group in grouped" :key="group.filePath" class="spec-file mb-4">
      <div class="spec-file__header d-flex align-center ga-2 mb-1">
        <code class="text-body-2">{{ group.localPath }}</code>
        <v-btn size="x-small" variant="text" @click="openFile(group.filePath)">
          Open
        </v-btn>
      </div>
      <ul class="spec-exports">
        <li v-for="exp in group.exports" :key="`${exp.name}:${exp.kind}`" class="spec-exports__item">
          <button type="button" class="spec-exports__btn" @click="openFile(exp.filePath)">
            <span class="spec-exports__name">{{ exp.name }}</span>
            <span class="spec-exports__kind">{{ exp.kind }}</span>
            <span v-if="exp.signature" class="spec-exports__sig">{{
              exp.signature
            }}</span>
          </button>
          <div v-if="exp.docstring" class="spec-exports__doc">
            {{ exp.docstring }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCommit } from "../requests/queries";
import { openSource } from "../source-links";
import { packageLocalFilePath } from "../repo-paths";

const props = defineProps<{
  subdomain: string;
  commitHash: string;
  packageName: string;
  packageDirectory: string;
  productRoot?: string;
  githubRepo?: string;
  localRepoRoot?: string;
}>();

const { data, isLoading, error } = useCommit(
  props.subdomain,
  () => props.commitHash,
);

const grouped = computed(() => {
  const exports = (data.value?.commitDetail.exports ?? []).filter(
    (e) => e.packageName === props.packageName,
  );
  const byFile = new Map<
    string,
    {
      filePath: string;
      localPath: string;
      exports: typeof exports;
    }
  >();
  for (const exp of exports) {
    let g = byFile.get(exp.filePath);
    if (!g) {
      g = {
        filePath: exp.filePath,
        localPath: packageLocalFilePath(
          exp.filePath,
          props.productRoot,
          props.packageDirectory,
        ),
        exports: [],
      };
      byFile.set(exp.filePath, g);
    }
    g.exports.push(exp);
  }
  return [...byFile.values()].sort((a, b) =>
    a.localPath.localeCompare(b.localPath),
  );
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
.spec-file__header code {
  font-size: 0.85rem;
}
.spec-exports {
  list-style: none;
  margin: 0;
  padding: 0;
}
.spec-exports__item {
  margin: 0.35rem 0 0.6rem;
}
.spec-exports__btn {
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
.spec-exports__name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  font-size: 0.875rem;
}
.spec-exports__kind {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.spec-exports__sig {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.spec-exports__doc {
  margin-top: 0.15rem;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 48rem;
}
</style>
