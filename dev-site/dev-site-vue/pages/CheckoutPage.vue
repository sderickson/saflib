<template>
  <div class="checkout-page">
    <v-progress-linear v-if="isLoading" indeterminate class="checkout-progress" />
    <v-alert v-if="error" type="error" density="compact" class="ma-2">
      {{ error.message }}
    </v-alert>
    <v-alert v-if="scanError" type="error" density="compact" class="ma-2">
      Scan failed: {{ scanError.message }}
    </v-alert>

    <template v-if="checkout">
      <div class="checkout-strip">
        <code class="checkout-strip__hash">{{ shortHash(checkout.hash) }}</code>
        <span
          class="checkout-strip__msg"
          :title="checkout.message"
        >{{ firstLine(checkout.message) }}</span>
        <span class="checkout-strip__date">{{ formatDateTime(checkout.authoredAt) }}</span>
        <v-chip
          size="x-small"
          variant="tonal"
          :color="checkout.analyzed ? 'success' : 'warning'"
          class="checkout-strip__chip"
        >
          {{ checkout.analyzed ? "analyzed" : "not analyzed" }}
        </v-chip>
        <v-switch
          :model-value="compareMode"
          hide-details
          density="compact"
          color="primary"
          class="checkout-strip__compare"
          label="Compare"
          @update:model-value="toggleCompare"
        />
        <v-select
          v-if="compareMode"
          :model-value="compareRef"
          :items="checkout.compareCandidates"
          density="compact"
          hide-details
          variant="outlined"
          class="checkout-strip__ref"
          @update:model-value="setCompareRef"
        />
        <v-chip
          v-if="compareMode && checkout.compare"
          size="x-small"
          variant="tonal"
          :color="checkout.compare.mergeBaseAnalyzed ? 'success' : 'warning'"
          class="checkout-strip__chip"
        >
          fork {{ shortHash(checkout.compare.mergeBaseHash) }}
          ·
          {{ checkout.compare.mergeBaseAnalyzed ? "analyzed" : "not analyzed" }}
        </v-chip>
        <v-btn
          v-if="githubRepo && githubCompareHref"
          size="small"
          variant="text"
          :href="githubCompareHref"
          target="_blank"
          rel="noopener noreferrer"
        >
          Changes on GitHub
        </v-btn>
        <v-btn
          v-if="compareMode && checkout.compare && !checkout.compare.mergeBaseAnalyzed"
          color="primary"
          size="small"
          variant="flat"
          :loading="isScanning"
          :disabled="isScanning"
          @click="scanForkPoint"
        >
          Scan fork point
        </v-btn>
      </div>

      <div v-if="checkout.analyzed && isEmptyCompare" class="checkout-unscanned">
        <p class="checkout-unscanned__title">Nothing unique on this checkout</p>
        <p class="checkout-unscanned__body">
          HEAD is the fork point of
          <code>{{ checkout.compare?.againstRef }}</code>
          — there are no commits unique to this branch to compare.
        </p>
      </div>

      <div v-else-if="checkout.analyzed" class="checkout-body">
        <ResizableColumns
          storage-key="dev-site.checkout.packagesWidth"
          :default-left="200"
          :min-left="140"
          :max-left="360"
        >
          <template #left>
            <div class="checkout-col checkout-col--packages">
              <v-alert
                v-if="compareMode && checkout.compare && !checkout.compare.mergeBaseAnalyzed"
                type="info"
                density="compact"
                variant="tonal"
                class="mb-2"
              >
                Scan the fork point
                <code>{{ shortHash(checkout.compare.mergeBaseHash) }}</code>
                ({{ firstLine(checkout.compare.mergeBaseMessage) }})
                to filter this tree to added, removed, and modified packages.
              </v-alert>
              <v-progress-linear v-if="isLoadingDiff" indeterminate class="mb-2" />
              <PackageDirTree
                :nodes="dirTree"
                :selected-package-name="selectedPackageName"
                @select="selectPackage"
              />
            </div>
          </template>
          <template #right>
            <div class="checkout-col checkout-col--package">
              <template v-if="selectedPkg">
                <header class="pkg-head">
                  <v-icon
                    size="small"
                    :icon="packageKindIcon(selectedPkg.kind)"
                    :title="selectedPkg.kind"
                  />
                  <span class="pkg-head__name" :title="selectedPkg.packageName">
                    {{ selectedPkg.packageName }}
                  </span>
                  <span
                    v-if="locDeltaText"
                    class="pkg-head__delta"
                    :title="'Source/test LOC vs fork point'"
                  >
                    {{ locDeltaText }}
                  </span>
                  <ChangeChip :change="selectedPkg.change" />
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    :color="packageSizeColor(selectedPkg.size)"
                    :title="`Size: ${PACKAGE_SIZE_LABELS[selectedPkg.size]}`"
                  >
                    {{ selectedPkg.size }}
                  </v-chip>
                  <span
                    class="pkg-head__meta"
                    :title="`${selectedPkg.sourceLines}/${selectedPkg.testLines} LOC`"
                  >
                    {{ formatLocPair(selectedPkg.sourceLines, selectedPkg.testLines) }} LOC
                    ·
                    <code>{{ selectedPkg.directory || "." }}</code>
                  </span>
                </header>
                <p
                  v-if="packageDescription"
                  class="pkg-desc"
                  :title="packageDescription"
                >
                  {{ packageDescription }}
                </p>

                <v-tabs
                  :model-value="tab"
                  density="compact"
                  class="pkg-tabs"
                  @update:model-value="setTab"
                >
                  <v-tab value="spec">Spec</v-tab>
                  <v-tab value="docs">Docs</v-tab>
                  <v-tab value="secrets">Secrets</v-tab>
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

                <div class="pkg-pane">
                  <PackageDbSpecPane
                    v-if="tab === 'spec' && selectedPkg.kind === 'db'"
                    :subdomain="subdomain"
                    :commit-hash="checkout.hash"
                    :compare-from-hash="compareFromHash"
                    :path-renames="pathRenames"
                    :package-name="selectedPkg.packageName"
                    :package-directory="selectedPkg.directory"
                    :product-root="checkout.productRoot"
                    :github-repo="githubRepo"
                    :github-ref="effectiveGithubRef"
                    :local-repo-root="localRepoRoot"
                    :scope="specScope"
                    @update:scope="setSpecScope"
                  />
                  <PackageSpecRoutesPane
                    v-else-if="tab === 'spec' && selectedPkg.kind === 'spec'"
                    :subdomain="subdomain"
                    :commit-hash="checkout.hash"
                    :compare-from-hash="compareFromHash"
                    :path-renames="pathRenames"
                    :package-name="selectedPkg.packageName"
                    :package-directory="selectedPkg.directory"
                    :product-root="checkout.productRoot"
                    :github-repo="githubRepo"
                    :github-ref="effectiveGithubRef"
                    :local-repo-root="localRepoRoot"
                  />
                  <PackageHttpPane
                    v-else-if="tab === 'spec' && selectedPkg.kind === 'http'"
                    :subdomain="subdomain"
                    :commit-hash="checkout.hash"
                    :compare-from-hash="compareFromHash"
                    :path-renames="pathRenames"
                    :package-name="selectedPkg.packageName"
                    :package-directory="selectedPkg.directory"
                    :product-root="checkout.productRoot"
                    :github-repo="githubRepo"
                    :github-ref="effectiveGithubRef"
                    :local-repo-root="localRepoRoot"
                    :scope="specScope"
                    @update:scope="setSpecScope"
                  />
                  <PackageSdkPane
                    v-else-if="tab === 'spec' && selectedPkg.kind === 'sdk'"
                    :subdomain="subdomain"
                    :commit-hash="checkout.hash"
                    :compare-from-hash="compareFromHash"
                    :path-renames="pathRenames"
                    :package-name="selectedPkg.packageName"
                    :package-directory="selectedPkg.directory"
                    :product-root="checkout.productRoot"
                    :github-repo="githubRepo"
                    :github-ref="effectiveGithubRef"
                    :local-repo-root="localRepoRoot"
                    :scope="specScope"
                    @update:scope="setSpecScope"
                  />
                  <PackageSpecPane
                    v-else-if="tab === 'spec'"
                    :subdomain="subdomain"
                    :commit-hash="checkout.hash"
                    :compare-from-hash="compareFromHash"
                    :path-renames="pathRenames"
                    :package-name="selectedPkg.packageName"
                    :package-directory="selectedPkg.directory"
                    :product-root="checkout.productRoot"
                    :github-repo="githubRepo"
                    :github-ref="effectiveGithubRef"
                    :local-repo-root="localRepoRoot"
                    :scope="specScope"
                    @update:scope="setSpecScope"
                  />
                  <PackageDocsPane
                    v-else-if="tab === 'docs'"
                    ref="docsPane"
                    :subdomain="subdomain"
                    :commit-hash="paneCommitHash"
                    :package-directory="selectedPkg.directory"
                    :package-name="selectedPkg.packageName"
                    :product-root="checkout.productRoot"
                    :packages="checkout.packages"
                    :github-repo="githubRepo"
                    :github-ref="effectiveGithubRef"
                    :local-repo-root="localRepoRoot"
                    @navigate-package="onDocNavigatePackage"
                  />
                  <PackageSecretsPane
                    v-else-if="tab === 'secrets'"
                    :subdomain="subdomain"
                    :commit-hash="paneCommitHash"
                    :package-directory="selectedPkg.directory"
                    :product-root="checkout.productRoot"
                  />
                  <PackageIssuesPane
                    v-else
                    :subdomain="subdomain"
                    :commit-hash="paneCommitHash"
                    :package-name="selectedPkg.packageName"
                    :package-directory="selectedPkg.directory"
                    :product-root="checkout.productRoot"
                    :github-repo="githubRepo"
                    :github-ref="effectiveGithubRef"
                    :local-repo-root="localRepoRoot"
                  />
                </div>
              </template>
              <p
                v-else-if="compareReady && !visibleRows.length"
                class="text-body-2 text-medium-emphasis pa-3"
              >
                No package changes versus the fork point.
              </p>
              <p v-else class="text-body-2 text-medium-emphasis pa-3">
                Select a package.
              </p>
            </div>
          </template>
        </ResizableColumns>
      </div>

      <div v-else class="checkout-unscanned">
        <p class="checkout-unscanned__title">This commit hasn’t been scanned yet</p>
        <p class="checkout-unscanned__body">
          Scan builds the package inventory so you can browse specs, docs, and
          issues for this checkout.
        </p>
        <v-btn
          color="primary"
          size="large"
          variant="flat"
          :loading="isScanning"
          :disabled="isScanning"
          @click="scanThisCommit"
        >
          Scan this commit
        </v-btn>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  useCheckout,
  useCommitDiff,
  useCommitPackage,
  useRepoFile,
  useScanMutation,
} from "../requests/queries";
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
import { formatLocChangePair, formatLocPair } from "../format-loc";
import type { TestScope } from "../test-tree";
import { toModuleStem } from "../test-tree";
import {
  filterPackageDirTree,
  packageChangesFromDiff,
  type ChangeKind,
} from "../package-change-overlay";
import PackageDirTree from "../components/PackageDirTree.vue";
import PackageDocsPane from "../components/PackageDocsPane.vue";
import PackageSecretsPane from "../components/PackageSecretsPane.vue";
import PackageSpecPane from "../components/PackageSpecPane.vue";
import PackageDbSpecPane from "../components/PackageDbSpecPane.vue";
import PackageSpecRoutesPane from "../components/PackageSpecRoutesPane.vue";
import PackageHttpPane from "../components/PackageHttpPane.vue";
import PackageSdkPane from "../components/PackageSdkPane.vue";
import PackageIssuesPane from "../components/PackageIssuesPane.vue";
import ResizableColumns from "../components/ResizableColumns.vue";
import ChangeChip from "../components/ChangeChip.vue";
import { githubCompareUrl, resolveGithubSourceRef } from "../source-links";

const props = withDefaults(
  defineProps<{
    subdomain: string;
    hubPath?: string;
    githubRepo?: string;
    githubRef?: string;
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

const compareRef = computed(() => {
  const q = route.query.compare;
  return typeof q === "string" && q ? q : undefined;
});
const compareMode = computed(() => Boolean(compareRef.value));

const {
  data: checkout,
  isLoading,
  error,
  refetch,
} = useCheckout(props.subdomain, compareRef);

/** Prefer server-configured repo (matches analyzed git root); router prop is fallback. */
const githubRepo = computed(
  () => checkout.value?.githubRepo ?? props.githubRepo,
);

const {
  mutate: scan,
  isPending: isScanning,
  error: scanError,
} = useScanMutation(props.subdomain);

const compareReady = computed(() => {
  const c = checkout.value;
  return Boolean(
    compareMode.value &&
      c?.analyzed &&
      c.compare?.mergeBaseAnalyzed &&
      c.compare.mergeBaseHash !== c.hash,
  );
});

const isEmptyCompare = computed(() => {
  const c = checkout.value;
  return Boolean(
    compareMode.value && c?.compare && c.compare.mergeBaseHash === c.hash,
  );
});

const compareFromHash = computed(() =>
  compareReady.value ? checkout.value?.compare?.mergeBaseHash : undefined,
);

const effectiveGithubRef = computed(() =>
  resolveGithubSourceRef({
    branch: checkout.value?.branch,
    commitHash: checkout.value?.hash,
    fallbackRef: props.githubRef,
  }),
);

const githubCompareHref = computed(() => {
  if (!githubRepo.value || !compareMode.value) {
    return undefined;
  }
  const c = checkout.value;
  const base = c?.compare?.mergeBaseHash;
  const head = effectiveGithubRef.value;
  if (!c?.hash || !base || base === c.hash) {
    return undefined;
  }
  return githubCompareUrl(githubRepo.value, base, head);
});

const pathRenames = computed(
  () => checkout.value?.compare?.renames ?? [],
);

const {
  data: diffData,
  isLoading: isLoadingDiff,
} = useCommitDiff(
  props.subdomain,
  () => (compareReady.value ? checkout.value?.compare?.mergeBaseHash ?? "" : ""),
  () => (compareReady.value ? checkout.value?.hash ?? "" : ""),
);

const changeByPackage = computed((): Record<string, ChangeKind> => {
  const diff = diffData.value?.commitDiff;
  if (!compareReady.value || !diff) return {};
  return packageChangesFromDiff(diff);
});

const mapPackageRow = (
  p: {
    packageName: string;
    directory: string;
    kind?: string;
    sourceLines: number;
    testLines: number;
    testFiles: number;
    debtCount?: number;
    issueCountsByKind?: {
      "dead-code": number;
      "oversized-file": number;
      "package-layout": number;
    };
    sourceFiles?: number;
    prodLines?: number;
  },
  change?: ChangeKind,
  locDelta?: { source: number; test: number },
) => ({
  ...p,
  kind: classifyPackageKind(p.kind),
  size: classifyPackageSize({
    sourceLines: p.sourceLines,
    testFiles: p.testFiles,
  }),
  change,
  locDelta,
});

const headRows = computed(() =>
  (checkout.value?.packages ?? []).map((p) => mapPackageRow(p)),
);

const visibleRows = computed(() => {
  if (!compareReady.value) return headRows.value;
  const changes = changeByPackage.value;
  const byName = new Map(headRows.value.map((p) => [p.packageName, p]));
  const removed = diffData.value?.commitDiff?.packageMetrics.removed ?? [];
  const changed = diffData.value?.commitDiff?.packageMetrics.changed ?? [];
  const rows = [];
  for (const [name, change] of Object.entries(changes)) {
    const head = byName.get(name);
    const gone = removed.find((p) => p.packageName === name);
    const src = head ?? gone;
    if (!src) continue;
    let locDelta: { source: number; test: number } | undefined;
    if (change === "added") {
      locDelta = { source: src.sourceLines, test: src.testLines };
    } else if (change === "removed") {
      locDelta = { source: -src.sourceLines, test: -src.testLines };
    } else {
      const pair = changed.find((c) => c.after.packageName === name);
      locDelta = pair
        ? {
            source: pair.after.sourceLines - pair.before.sourceLines,
            test: pair.after.testLines - pair.before.testLines,
          }
        : { source: 0, test: 0 };
    }
    rows.push(mapPackageRow(src, change, locDelta));
  }
  return rows.sort((a, b) => a.directory.localeCompare(b.directory));
});

const dirTree = computed(() => {
  const tree = buildPackageDirTree(visibleRows.value);
  if (!compareReady.value) return tree;
  return filterPackageDirTree(tree, changeByPackage.value);
});

const selectedPackageName = computed(() => {
  const q = route.query.package;
  return typeof q === "string" ? q : "";
});

const selectedPkg = computed(() =>
  visibleRows.value.find((p) => p.packageName === selectedPackageName.value),
);

const locDeltaText = computed(() => {
  const d = selectedPkg.value?.locDelta;
  if (!d || (d.source === 0 && d.test === 0)) return "";
  return `${formatLocChangePair(d.source, d.test)} LOC`;
});

const paneCommitHash = computed(() => {
  if (selectedPkg.value?.change === "removed") {
    return checkout.value?.compare?.mergeBaseHash ?? "";
  }
  return checkout.value?.analyzed ? checkout.value.hash : "";
});

const { data: packageDetailData } = useCommitPackage(
  props.subdomain,
  paneCommitHash,
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

const tab = computed<"spec" | "docs" | "secrets" | "issues">(() => {
  const t = route.query.tab;
  if (t === "docs" || t === "secrets" || t === "issues") return t;
  return "spec";
});

const specScope = computed<TestScope>(() => {
  const file = route.query.file;
  const dir = route.query.dir;
  if (typeof file === "string" && file) {
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
    value === "docs" || value === "secrets" || value === "issues"
      ? value
      : "spec";
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
  if (!selectedPkg.value || !paneCommitHash.value) return "";
  const prefix = repoPathPrefix(
    checkout.value?.productRoot ?? "",
    selectedPkg.value.directory,
  );
  return prefix ? `${prefix}/package.json` : "package.json";
});

const { data: packageJsonFile } = useRepoFile(props.subdomain, () => ({
  ref: paneCommitHash.value,
  path: packageJsonPath.value,
}));

const packageDescription = computed(() => {
  const content = packageJsonFile.value?.content;
  if (!content) return null;
  return parsePackageDescription(content);
});

watch(
  [checkout, selectedPackageName, visibleRows, isEmptyCompare],
  () => {
    if (!checkout.value?.analyzed || isEmptyCompare.value) return;
    if (!visibleRows.value.length) return;
    if (
      selectedPackageName.value &&
      visibleRows.value.some((p) => p.packageName === selectedPackageName.value)
    ) {
      return;
    }
    const first = visibleRows.value[0];
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

const scanForkPoint = () => {
  const hash = checkout.value?.compare?.mergeBaseHash;
  if (!hash) return;
  scan({ commitHash: hash }, { onSuccess: () => refetch() });
};

const toggleCompare = (on: unknown) => {
  if (!on) {
    replaceQuery({ compare: undefined });
    return;
  }
  const ref =
    compareRef.value ||
    checkout.value?.compare?.againstRef ||
    checkout.value?.compareCandidates?.[0] ||
    "main";
  replaceQuery({ compare: ref });
};

const setCompareRef = (value: unknown) => {
  if (typeof value === "string" && value) {
    replaceQuery({ compare: value });
  }
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
.checkout-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.checkout-progress {
  flex: 0 0 auto;
}
.checkout-strip {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding: 0.35rem 0.75rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  font-size: 0.75rem;
  min-width: 0;
}
.checkout-strip__compare {
  flex: 0 0 auto;
  margin: 0;
}
.checkout-strip__ref {
  flex: 0 0 9rem;
}
.checkout-strip__hash {
  flex: 0 0 auto;
  font-size: 0.75rem;
}
.checkout-strip__msg {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), 0.85);
}
.checkout-strip__date {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), 0.5);
  white-space: nowrap;
}
.checkout-strip__chip {
  flex: 0 0 auto;
}
.checkout-unscanned {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1.5rem;
  text-align: center;
}
.checkout-unscanned__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}
.checkout-unscanned__body {
  margin: 0 0 0.5rem;
  max-width: 28rem;
  font-size: 0.9rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.checkout-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.checkout-col {
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  overflow: auto;
}
.checkout-col--packages {
  padding: 0.4rem 0.35rem;
}
.checkout-col--package {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pkg-head {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.55rem;
  padding: 0.45rem 0.75rem 0.25rem;
  min-width: 0;
}
.pkg-head__name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: min(28rem, 55vw);
}
.pkg-head__delta {
  flex: 0 0 auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.pkg-head__meta {
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pkg-desc {
  flex: 0 0 auto;
  margin: 0;
  padding: 0 0.75rem 0.35rem;
  font-size: 0.75rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pkg-tabs {
  flex: 0 0 auto;
  padding: 0 0.35rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.pkg-pane {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  padding: 0.5rem 0.5rem 0.75rem;
}
.pkg-pane > * {
  height: 100%;
  min-height: 0;
}
</style>
