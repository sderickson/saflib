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
            <div class="d-flex flex-wrap align-center ga-2 mb-3">
              <v-icon :icon="packageKindIcon(selectedPkg.kind)" />
              <h2 class="text-h6 mb-0">{{ selectedPkg.packageName }}</h2>
              <v-chip size="small" variant="tonal">{{ selectedPkg.kind }}</v-chip>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-3">
              {{ selectedPkg.sourceLines }} src /
              {{ selectedPkg.testLines }} test LOC ·
              {{ selectedPkg.testFiles }} test files ·
              <code>{{ selectedPkg.directory || "." }}</code>
            </p>

            <v-tabs v-model="tab" density="compact" class="mb-3">
              <v-tab value="tests">Tests</v-tab>
              <v-tab value="docs">Docs</v-tab>
              <v-tab value="spec">Spec</v-tab>
            </v-tabs>

            <v-tabs-window v-model="tab">
              <v-tabs-window-item value="tests">
                <v-progress-linear
                  v-if="commitLoading"
                  indeterminate
                  class="mb-2"
                />
                <TestTree v-if="testTree.length" :nodes="testTree" />
                <p
                  v-else-if="!commitLoading"
                  class="text-body-2 text-medium-emphasis"
                >
                  No test cases found for this package.
                </p>
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
                  :local-repo-root="localRepoRoot"
                  @navigate-package="onDocNavigatePackage"
                />
              </v-tabs-window-item>

              <v-tabs-window-item value="spec">
                <PackageSpecPane
                  :subdomain="subdomain"
                  :commit-hash="checkout.hash"
                  :package-name="selectedPkg.packageName"
                  :package-directory="selectedPkg.directory"
                  :product-root="checkout.productRoot"
                  :github-repo="githubRepo"
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
import { useCheckout, useCommit, useScanMutation } from "../requests/queries";
import { classifyPackageKind } from "../package-kind";
import {
  buildPackageDirTree,
  packageKindIcon,
} from "../package-dir-tree";
import { buildPackageTestTree } from "../test-tree";
import PackageDirTree from "../components/PackageDirTree.vue";
import PackageDocsPane from "../components/PackageDocsPane.vue";
import PackageSpecPane from "../components/PackageSpecPane.vue";
import TestTree from "../components/TestTree.vue";

const props = withDefaults(
  defineProps<{
    subdomain: string;
    hubPath?: string;
    /** `owner/repo` for GitHub blob links. */
    githubRepo?: string;
    /** Absolute host path to the analyzed checkout (IDE deep links). */
    localRepoRoot?: string;
  }>(),
  {
    hubPath: "/",
  },
);

const route = useRoute();
const router = useRouter();

const tab = ref<"tests" | "docs" | "spec">("tests");
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
    // Default to first package if none selected / invalid
    const first = packageRows.value[0];
    if (first) {
      router.replace({
        query: { ...route.query, package: first.packageName },
      });
    }
  },
  { immediate: true },
);

const selectPackage = (name: string) => {
  tab.value = "tests";
  router.replace({ query: { ...route.query, package: name } });
};

const onDocNavigatePackage = (packageName: string, docPath: string) => {
  tab.value = "docs";
  router.replace({ query: { ...route.query, package: packageName } });
  // Open doc after pane remounts for new package
  requestAnimationFrame(() => {
    docsPane.value?.openDoc(docPath);
  });
};

const commitHash = computed(() =>
  checkout.value?.analyzed ? checkout.value.hash : "",
);

const {
  data: commitData,
  isLoading: commitLoading,
} = useCommit(props.subdomain, commitHash);

const testTree = computed(() => {
  const detail = commitData.value?.commitDetail;
  if (!detail || !selectedPkg.value) return [];
  return buildPackageTestTree(
    detail.testCases,
    selectedPkg.value.packageName,
    selectedPkg.value.directory,
  );
});

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
  max-height: 75vh;
  overflow: auto;
}
.checkout-split__panel {
  min-width: 0;
}
</style>
