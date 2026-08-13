<template>
  <v-container fluid class="checkout-page">
    <div class="d-flex align-center mb-4 ga-2">
      <v-btn variant="text" :to="hubPath">← Hub</v-btn>
      <h1 class="text-h4">Current checkout</h1>
    </div>

    <v-progress-linear v-if="isLoading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>
    <v-alert v-if="scanError" type="error" class="mb-4">
      Scan failed: {{ scanError.message }}
    </v-alert>

    <template v-if="checkout">
      <v-sheet class="pa-4 mb-4" border rounded>
        <div class="text-caption text-medium-emphasis">HEAD</div>
        <div class="d-flex flex-wrap align-center ga-3 mb-2">
          <code>{{ shortHash(checkout.hash) }}</code>
          <v-chip
            size="small"
            :color="checkout.analyzed ? 'success' : 'warning'"
          >
            {{ checkout.analyzed ? "Analyzed" : "Not analyzed" }}
          </v-chip>
        </div>
        <div class="text-body-1 mb-1">{{ firstLine(checkout.message) }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ formatDateTime(checkout.authoredAt) }}
        </div>

        <v-btn
          v-if="!checkout.analyzed"
          class="mt-4"
          color="primary"
          :loading="isScanning"
          :disabled="isScanning"
          @click="scanThisCommit"
        >
          Scan this commit
        </v-btn>
      </v-sheet>

      <div v-if="checkout.analyzed" class="checkout-split">
        <aside class="checkout-split__nav">
          <div class="text-caption text-medium-emphasis mb-2 px-1">
            Packages
          </div>
          <PackageDirTree
            :nodes="dirTree"
            :selected-package-name="selectedPackageName"
            @select="selectPackage"
          />
        </aside>

        <section class="checkout-split__panel">
          <template v-if="selectedPkg">
            <div class="d-flex flex-wrap align-center ga-2 mb-2">
              <v-icon
                :icon="packageKindIcon(selectedPkg.kind)"
                :title="selectedPkg.kind"
              />
              <h2 class="text-h6 mb-0">{{ selectedPkg.packageName }}</h2>
              <v-chip
                size="small"
                variant="tonal"
                :color="packageSizeColor(selectedPkg.size)"
                :title="`Size: ${PACKAGE_SIZE_LABELS[selectedPkg.size]}`"
              >
                {{ selectedPkg.size }} · {{ PACKAGE_SIZE_LABELS[selectedPkg.size] }}
              </v-chip>
            </div>
            <p v-if="packageDescription" class="text-body-2 mb-2 package-desc">
              {{ packageDescription }}
            </p>
            <p class="text-body-2 text-medium-emphasis mb-3">
              {{ selectedPkg.sourceLines }} src /
              {{ selectedPkg.testLines }} test LOC ·
              {{ selectedPkg.testFiles }} test files ·
              <code>{{ selectedPkg.directory || "." }}</code>
            </p>

            <v-tabs
              :model-value="tab"
              density="compact"
              class="mb-3"
              @update:model-value="setTab"
            >
              <v-tab value="spec">Spec</v-tab>
              <v-tab value="docs">Docs</v-tab>
              <v-tab value="issues">
                Issues
                <v-chip
                  v-if="issueCount > 0"
                  class="ml-2"
                  size="x-small"
                  color="warning"
                  variant="flat"
                >
                  {{ issueCount }}
                </v-chip>
              </v-tab>
            </v-tabs>

            <v-tabs-window :model-value="tab">
              <v-tabs-window-item value="spec">
                <PackageDbSpecPane
                  v-if="selectedPkg.kind === 'db'"
                  :subdomain="subdomain"
                  :commit-hash="checkout.hash"
                  :package-name="selectedPkg.packageName"
                  :package-directory="selectedPkg.directory"
                  :product-root="checkout.productRoot"
                  :github-repo="githubRepo"
                  :github-ref="githubRef"
                  :local-repo-root="localRepoRoot"
                />
                <PackageSpecRoutesPane
                  v-else-if="selectedPkg.kind === 'spec'"
                  :subdomain="subdomain"
                  :commit-hash="checkout.hash"
                  :package-name="selectedPkg.packageName"
                  :package-directory="selectedPkg.directory"
                  :product-root="checkout.productRoot"
                  :github-repo="githubRepo"
                  :github-ref="githubRef"
                  :local-repo-root="localRepoRoot"
                />
                <PackageSpecPane
                  v-else
                  :subdomain="subdomain"
                  :commit-hash="checkout.hash"
                  :package-name="selectedPkg.packageName"
                  :package-directory="selectedPkg.directory"
                  :product-root="checkout.productRoot"
                  :github-repo="githubRepo"
                  :github-ref="githubRef"
                  :local-repo-root="localRepoRoot"
                  :scope="specScope"
                  @update:scope="setSpecScope"
                />
              </v-tabs-window-item>

              <v-tabs-window-item value="docs">
                <PackageDocsPane
                  ref="docsPane"
                  :subdomain="subdomain"
                  :commit-hash="checkout.hash"
                  :package-directory="selectedPkg.directory"
                  :package-name="selectedPkg.packageName"
                  :product-root="checkout.productRoot"
                  :packages="checkout.packages"
                  :github-repo="githubRepo"
                  :github-ref="githubRef"
                  :local-repo-root="localRepoRoot"
                  @navigate-package="onDocNavigatePackage"
                />
              </v-tabs-window-item>

              <v-tabs-window-item value="issues">
                <PackageIssuesPane
                  :subdomain="subdomain"
                  :commit-hash="checkout.hash"
                  :package-name="selectedPkg.packageName"
                  :package-directory="selectedPkg.directory"
                  :product-root="checkout.productRoot"
                  :github-repo="githubRepo"
                  :github-ref="githubRef"
                  :local-repo-root="localRepoRoot"
                />
              </v-tabs-window-item>
            </v-tabs-window>
          </template>
          <p v-else class="text-body-2 text-medium-emphasis">
            Select a package on the left.
          </p>
        </section>
      </div>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCheckout, useCommitPackage, useRepoFile, useScanMutation } from "../requests/queries";
import { classifyPackageKind } from "../package-kind";
import {
  buildPackageDirTree,
  packageKindIcon,
} from "../package-dir-tree";
import {
  classifyPackageSize,
  PACKAGE_SIZE_LABELS,
  packageSizeColor,
} from "../package-size";
import { parsePackageDescription } from "../scope-docs";
import { collectPackageIssues } from "../package-issues";
import { repoPathPrefix } from "../repo-paths";
import type { TestScope } from "../test-tree";
import { toModuleStem } from "../test-tree";
import PackageDirTree from "../components/PackageDirTree.vue";
import PackageDocsPane from "../components/PackageDocsPane.vue";
import PackageSpecPane from "../components/PackageSpecPane.vue";
import PackageDbSpecPane from "../components/PackageDbSpecPane.vue";
import PackageSpecRoutesPane from "../components/PackageSpecRoutesPane.vue";
import PackageIssuesPane from "../components/PackageIssuesPane.vue";

const props = withDefaults(
  defineProps<{
    subdomain: string;
    hubPath?: string;
    /** `owner/repo` for GitHub blob links. */
    githubRepo?: string;
    /** Branch/tag for GitHub blob links (default `main`). */
    githubRef?: string;
    /** Absolute host path to the analyzed checkout (IDE deep links). */
    localRepoRoot?: string;
  }>(),
  {
    hubPath: "/",
    githubRef: "main",
  },
);

const route = useRoute();
const router = useRouter();

const docsPane = ref<{ openDoc: (path: string) => void } | null>(null);

const {
  data: checkout,
  isLoading,
  error,
  refetch,
} = useCheckout(props.subdomain);

const {
  mutate: scan,
  isPending: isScanning,
  error: scanError,
} = useScanMutation(props.subdomain);

const packageRows = computed(() =>
  (checkout.value?.packages ?? []).map((p) => ({
    ...p,
    kind: classifyPackageKind(p.packageName, p.directory),
    size: classifyPackageSize({
      sourceLines: p.sourceLines,
      testFiles: p.testFiles,
    }),
  })),
);

const dirTree = computed(() => buildPackageDirTree(packageRows.value));

const selectedPackageName = computed(() => {
  const q = route.query.package;
  return typeof q === "string" ? q : "";
});

const selectedPkg = computed(() =>
  packageRows.value.find((p) => p.packageName === selectedPackageName.value),
);

const { data: packageDetailData } = useCommitPackage(
  props.subdomain,
  () => (checkout.value?.analyzed ? checkout.value.hash : ""),
  () => selectedPackageName.value,
);

const issueCount = computed(() => {
  const d = packageDetailData.value?.packageDetail;
  const pkg = selectedPkg.value;
  if (!d || !pkg) return 0;
  return collectPackageIssues(d, {
    packageDirectory: pkg.directory,
    productRoot: checkout.value?.productRoot ?? "",
  }).length;
});

const tab = computed<"spec" | "docs" | "issues">(() => {
  const t = route.query.tab;
  if (t === "docs" || t === "issues") return t;
  return "spec";
});

const specScope = computed<TestScope>(() => {
  const file = route.query.file;
  const dir = route.query.dir;
  if (typeof file === "string" && file) {
    // Normalize legacy `foo.test.ts` URLs to the module stem.
    return { kind: "file", localPath: toModuleStem(file) };
  }
  if (typeof dir === "string" && dir) {
    return { kind: "dir", localPath: dir };
  }
  return { kind: "all" };
});

const replaceQuery = (patch: Record<string, string | undefined>) => {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(route.query)) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) continue;
    if (typeof v === "string" && v) next[k] = v;
    else if (Array.isArray(v) && typeof v[0] === "string" && v[0]) {
      next[k] = v[0];
    }
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== "") next[k] = v;
  }
  router.replace({ query: next });
};

const setTab = (value: unknown) => {
  const next =
    value === "docs" || value === "issues" ? value : "spec";
  replaceQuery({ tab: next === "spec" ? undefined : next });
};

const setSpecScope = (scope: TestScope) => {
  if (scope.kind === "all") {
    replaceQuery({ file: undefined, dir: undefined });
    return;
  }
  if (scope.kind === "file") {
    replaceQuery({ file: toModuleStem(scope.localPath), dir: undefined });
    return;
  }
  replaceQuery({ dir: scope.localPath, file: undefined });
};

const packageJsonPath = computed(() => {
  if (!selectedPkg.value || !checkout.value?.analyzed) return "";
  const prefix = repoPathPrefix(
    checkout.value.productRoot,
    selectedPkg.value.directory,
  );
  return prefix ? `${prefix}/package.json` : "package.json";
});

const { data: packageJsonFile } = useRepoFile(props.subdomain, () => ({
  ref: checkout.value?.analyzed ? checkout.value.hash : "",
  path: packageJsonPath.value,
}));

const packageDescription = computed(() => {
  const content = packageJsonFile.value?.content;
  if (!content) return null;
  return parsePackageDescription(content);
});

watch(
  [checkout, selectedPackageName],
  () => {
    if (!checkout.value?.analyzed || !packageRows.value.length) return;
    if (
      selectedPackageName.value &&
      packageRows.value.some((p) => p.packageName === selectedPackageName.value)
    ) {
      return;
    }
    const first = packageRows.value[0];
    if (first) {
      replaceQuery({ package: first.packageName });
    }
  },
  { immediate: true },
);

const selectPackage = (name: string) => {
  replaceQuery({
    package: name,
    tab: undefined,
    file: undefined,
    dir: undefined,
  });
};

const onDocNavigatePackage = (packageName: string, docPath: string) => {
  replaceQuery({
    package: packageName,
    tab: "docs",
    file: undefined,
    dir: undefined,
  });
  requestAnimationFrame(() => {
    docsPane.value?.openDoc(docPath);
  });
};

const scanThisCommit = () => {
  if (!checkout.value) return;
  scan(
    { commitHash: checkout.value.hash },
    { onSuccess: () => refetch() },
  );
};

const shortHash = (hash: string) => hash.slice(0, 10);
const firstLine = (message: string) => message.split("\n")[0] ?? message;
const formatDateTime = (dateTimeString: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateTimeString));
  } catch {
    return dateTimeString;
  }
};
</script>

<style scoped>
.checkout-split {
  display: grid;
  grid-template-columns: minmax(14rem, 20rem) 1fr;
  gap: 1.25rem;
  align-items: start;
  min-height: 60vh;
}
@media (max-width: 960px) {
  .checkout-split {
    grid-template-columns: 1fr;
  }
}
.checkout-split__nav {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 6px;
  padding: 0.75rem 0.5rem;
}
.checkout-split__panel {
  min-width: 0;
}
.package-desc {
  max-width: 42rem;
  line-height: 1.45;
}
</style>
