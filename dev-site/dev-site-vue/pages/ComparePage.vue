<template>
  <v-container>
    <v-row>
      <v-col>
        <h1 class="text-h4 mb-4">Compare commits</h1>

        <v-row class="mb-4" density="comfortable">
          <v-col cols="12" md="5">
            <v-select
              v-model="fromHash"
              :items="commitOptions"
              label="Before (baseline)"
              item-title="title"
              item-value="hash"
              :loading="isLoadingList"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-select
              v-model="toHash"
              :items="commitOptions"
              label="After"
              item-title="title"
              item-value="hash"
              :loading="isLoadingList"
              hide-details
            />
          </v-col>
        </v-row>

        <v-progress-linear v-if="isLoadingDiff" indeterminate class="mb-4" />

        <v-alert v-if="listError" type="error" class="mb-4">
          Error loading commits: {{ listError.message }}
        </v-alert>
        <v-alert v-if="diffError" type="error" class="mb-4">
          Error loading diff: {{ diffError.message }}
        </v-alert>

        <template v-if="diff">
          <p class="text-body-2 mb-4">
            <code>{{ shortHash(diff.fromHash) }}</code>
            →
            <code>{{ shortHash(diff.toHash) }}</code>
          </p>

          <h2 class="text-h6 mb-2">
            Packages — +{{ diff.packageMetrics.added.length }} /
            −{{ diff.packageMetrics.removed.length }} /
            ~{{ diff.packageMetrics.changed.length }}
          </h2>
          <v-list v-if="hasPackageChanges" density="compact" class="mb-4">
            <v-list-item
              v-for="pkg in diff.packageMetrics.added"
              :key="'a-' + pkg.packageName"
            >
              <v-chip color="success" size="x-small" class="mr-2">added</v-chip>
              {{ pkg.packageName }}
            </v-list-item>
            <v-list-item
              v-for="pkg in diff.packageMetrics.removed"
              :key="'r-' + pkg.packageName"
            >
              <v-chip color="error" size="x-small" class="mr-2">removed</v-chip>
              {{ pkg.packageName }}
            </v-list-item>
            <v-list-item
              v-for="chg in diff.packageMetrics.changed"
              :key="'c-' + chg.after.packageName"
            >
              <v-chip color="warning" size="x-small" class="mr-2">changed</v-chip>
              {{ chg.after.packageName }}:
              {{ chg.before.sourceLines }}→{{ chg.after.sourceLines }} src LOC,
              {{ chg.before.testLines }}→{{ chg.after.testLines }} test LOC
            </v-list-item>
          </v-list>
          <p v-else class="text-body-2 mb-4">No package metric changes.</p>

          <h2 class="text-h6 mb-2">
            Exports — +{{ diff.exports.added.length }} /
            −{{ diff.exports.removed.length }}
          </h2>
          <v-data-table
            v-if="diff.exports.added.length + diff.exports.removed.length > 0"
            :headers="exportHeaders"
            :items="exportRows"
            class="elevation-1 mb-6"
          >
            <template #[`item.change`]="{ item }">
              <v-chip
                :color="item.change === 'added' ? 'success' : 'error'"
                size="small"
              >
                {{ item.change }}
              </v-chip>
            </template>
            <template #bottom></template>
          </v-data-table>
          <p v-else class="text-body-2 mb-6">No export changes.</p>

          <h2 class="text-h6 mb-2">
            Test cases — +{{ diff.testCases.added.length }} /
            −{{ diff.testCases.removed.length }}
          </h2>
          <v-data-table
            v-if="diff.testCases.added.length + diff.testCases.removed.length > 0"
            :headers="testHeaders"
            :items="testRows"
            class="elevation-1"
          >
            <template #[`item.change`]="{ item }">
              <v-chip
                :color="item.change === 'added' ? 'success' : 'error'"
                size="small"
              >
                {{ item.change }}
              </v-chip>
            </template>
            <template #bottom></template>
          </v-data-table>
          <p v-else class="text-body-2">No test case changes.</p>

          <h2 class="text-h6 mt-6 mb-2">
            Database schemas —
            tables +{{ diff.dbSchemas.tables.added.length }} /
            −{{ diff.dbSchemas.tables.removed.length }},
            columns +{{ diff.dbSchemas.columns.added.length }} /
            −{{ diff.dbSchemas.columns.removed.length }} /
            ~{{ diff.dbSchemas.columns.changed.length }}
          </h2>
          <v-list
            v-if="hasDbSchemaChanges"
            density="compact"
            class="mb-4"
          >
            <v-list-item
              v-for="t in diff.dbSchemas.tables.added"
              :key="'ta-' + t.packageName + t.tableName"
            >
              <v-chip color="success" size="x-small" class="mr-2">table+</v-chip>
              {{ t.packageName }} · <code>{{ t.tableName }}</code>
            </v-list-item>
            <v-list-item
              v-for="t in diff.dbSchemas.tables.removed"
              :key="'tr-' + t.packageName + t.tableName"
            >
              <v-chip color="error" size="x-small" class="mr-2">table−</v-chip>
              {{ t.packageName }} · <code>{{ t.tableName }}</code>
            </v-list-item>
            <v-list-item
              v-for="c in diff.dbSchemas.columns.added"
              :key="'ca-' + c.packageName + c.tableName + c.sqlName"
            >
              <v-chip color="success" size="x-small" class="mr-2">col+</v-chip>
              <code>{{ c.tableName }}.{{ c.sqlName }}</code>
              · {{ c.typeKind }}
            </v-list-item>
            <v-list-item
              v-for="c in diff.dbSchemas.columns.removed"
              :key="'cr-' + c.packageName + c.tableName + c.sqlName"
            >
              <v-chip color="error" size="x-small" class="mr-2">col−</v-chip>
              <code>{{ c.tableName }}.{{ c.sqlName }}</code>
              · {{ c.typeKind }}
            </v-list-item>
            <v-list-item
              v-for="chg in diff.dbSchemas.columns.changed"
              :key="'cc-' + chg.after.packageName + chg.after.tableName + chg.after.sqlName"
            >
              <v-chip color="warning" size="x-small" class="mr-2">col~</v-chip>
              <code>{{ chg.after.tableName }}.{{ chg.after.sqlName }}</code>:
              {{ chg.before.typeKind }}→{{ chg.after.typeKind }}
            </v-list-item>
          </v-list>
          <p v-else class="text-body-2 mb-4">No database schema changes.</p>
        </template>

        <p
          v-else-if="!isLoadingDiff && fromHash && toHash && !diffError"
          class="text-body-1"
        >
          Select two commits to compare.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useCommits, useCommitDiff } from "../requests/queries";

const props = defineProps<{
  subdomain: string;
  /** Initial baseline ("before") hash. */
  initialFromHash?: string;
  /** Initial comparison ("after") hash. */
  initialToHash?: string;
}>();

const fromHash = ref(props.initialFromHash ?? "");
const toHash = ref(props.initialToHash ?? "");

watch(
  () => [props.initialFromHash, props.initialToHash] as const,
  ([from, to]) => {
    if (from) fromHash.value = from;
    if (to) toHash.value = to;
  },
);

const {
  data: listData,
  isLoading: isLoadingList,
  error: listError,
} = useCommits(props.subdomain, { limit: 100 });

const commitOptions = computed(() =>
  (listData.value?.commits ?? []).map((c) => ({
    hash: c.hash,
    title: `${c.hash.slice(0, 10)} — ${(c.message.split("\n")[0] ?? "").slice(0, 60)}`,
  })),
);

const {
  data: diffData,
  isLoading: isLoadingDiff,
  error: diffError,
} = useCommitDiff(props.subdomain, fromHash, toHash);

const diff = computed(() => diffData.value?.commitDiff);

const hasPackageChanges = computed(() => {
  const d = diff.value;
  if (!d) return false;
  return (
    d.packageMetrics.added.length +
      d.packageMetrics.removed.length +
      d.packageMetrics.changed.length >
    0
  );
});

const hasDbSchemaChanges = computed(() => {
  const d = diff.value;
  if (!d) return false;
  const s = d.dbSchemas;
  return (
    s.tables.added.length +
      s.tables.removed.length +
      s.columns.added.length +
      s.columns.removed.length +
      s.columns.changed.length >
    0
  );
});

const exportHeaders = [
  { title: "Change", key: "change" },
  { title: "Package", key: "packageName" },
  { title: "File", key: "filePath" },
  { title: "Name", key: "name" },
  { title: "Kind", key: "kind" },
];

const testHeaders = [
  { title: "Change", key: "change" },
  { title: "Package", key: "packageName" },
  { title: "File", key: "filePath" },
  { title: "Full name", key: "fullName" },
];

const exportRows = computed(() => {
  const d = diff.value;
  if (!d) return [];
  return [
    ...d.exports.added.map((e) => ({ ...e, change: "added" as const })),
    ...d.exports.removed.map((e) => ({ ...e, change: "removed" as const })),
  ];
});

const testRows = computed(() => {
  const d = diff.value;
  if (!d) return [];
  return [
    ...d.testCases.added.map((t) => ({ ...t, change: "added" as const })),
    ...d.testCases.removed.map((t) => ({ ...t, change: "removed" as const })),
  ];
});

const shortHash = (hash: string) => hash.slice(0, 10);
</script>
