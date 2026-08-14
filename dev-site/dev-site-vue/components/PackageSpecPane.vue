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

          <TestTree
            v-if="specTree.length"
            :nodes="specTree"
            @open-source="openFile"
          />
          <p v-else class="text-body-2 text-medium-emphasis">
            No exports or tests in this scope.
          </p>
        </div>
      </template>
    </ResizableColumns>
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
</style>
