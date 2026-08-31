<template>
  <v-container>
    <v-row>
      <v-col>
        <h1 class="text-h4 mb-4">Compare commits</h1>

        <v-row class="mb-4" density="comfortable">
          <v-col cols="12" md="5">
            <v-select
              v-model="from_hash"
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
              v-model="to_hash"
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
            <code>{{ shortHash(diff.from_hash) }}</code>
            →
            <code>{{ shortHash(diff.to_hash) }}</code>
          </p>

          <h2 class="text-h6 mb-2">
            Packages — +{{ diff.package_metrics.added.length }} /
            −{{ diff.package_metrics.removed.length }} /
            ~{{ diff.package_metrics.changed.length }}
          </h2>
          <v-list v-if="hasPackageChanges" density="compact" class="mb-4">
            <v-list-item
              v-for="pkg in diff.package_metrics.added"
              :key="'a-' + pkg.package_name"
            >
              <v-chip color="success" size="x-small" class="mr-2">added</v-chip>
              {{ pkg.package_name }}
            </v-list-item>
            <v-list-item
              v-for="pkg in diff.package_metrics.removed"
              :key="'r-' + pkg.package_name"
            >
              <v-chip color="error" size="x-small" class="mr-2">removed</v-chip>
              {{ pkg.package_name }}
            </v-list-item>
            <v-list-item
              v-for="chg in diff.package_metrics.changed"
              :key="'c-' + chg.after.package_name"
            >
              <v-chip color="warning" size="x-small" class="mr-2">changed</v-chip>
              {{ chg.after.package_name }}:
              {{ formatLoc(chg.before.source_lines) }}→{{ formatLoc(chg.after.source_lines) }} src LOC,
              {{ formatLoc(chg.before.test_lines) }}→{{ formatLoc(chg.after.test_lines) }} test LOC
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
            Test cases — +{{ diff.test_cases.added.length }} /
            −{{ diff.test_cases.removed.length }}
          </h2>
          <v-data-table
            v-if="diff.test_cases.added.length + diff.test_cases.removed.length > 0"
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
            tables +{{ diff.db_schemas.tables.added.length }} /
            −{{ diff.db_schemas.tables.removed.length }},
            columns +{{ diff.db_schemas.columns.added.length }} /
            −{{ diff.db_schemas.columns.removed.length }} /
            ~{{ diff.db_schemas.columns.changed.length }}
          </h2>
          <v-list
            v-if="hasDbSchemaChanges"
            density="compact"
            class="mb-4"
          >
            <v-list-item
              v-for="t in diff.db_schemas.tables.added"
              :key="'ta-' + t.package_name + t.table_name"
            >
              <v-chip color="success" size="x-small" class="mr-2">table+</v-chip>
              {{ t.package_name }} · <code>{{ t.table_name }}</code>
            </v-list-item>
            <v-list-item
              v-for="t in diff.db_schemas.tables.removed"
              :key="'tr-' + t.package_name + t.table_name"
            >
              <v-chip color="error" size="x-small" class="mr-2">table−</v-chip>
              {{ t.package_name }} · <code>{{ t.table_name }}</code>
            </v-list-item>
            <v-list-item
              v-for="c in diff.db_schemas.columns.added"
              :key="'ca-' + c.package_name + c.table_name + c.sql_name"
            >
              <v-chip color="success" size="x-small" class="mr-2">col+</v-chip>
              <code>{{ c.table_name }}.{{ c.sql_name }}</code>
              · {{ c.type_kind }}
            </v-list-item>
            <v-list-item
              v-for="c in diff.db_schemas.columns.removed"
              :key="'cr-' + c.package_name + c.table_name + c.sql_name"
            >
              <v-chip color="error" size="x-small" class="mr-2">col−</v-chip>
              <code>{{ c.table_name }}.{{ c.sql_name }}</code>
              · {{ c.type_kind }}
            </v-list-item>
            <v-list-item
              v-for="chg in diff.db_schemas.columns.changed"
              :key="'cc-' + chg.after.package_name + chg.after.table_name + chg.after.sql_name"
            >
              <v-chip color="warning" size="x-small" class="mr-2">col~</v-chip>
              <code>{{ chg.after.table_name }}.{{ chg.after.sql_name }}</code>:
              {{ chg.before.type_kind }}→{{ chg.after.type_kind }}
            </v-list-item>
          </v-list>
          <p v-else class="text-body-2 mb-4">No database schema changes.</p>
        </template>

        <p
          v-else-if="!isLoadingDiff && from_hash && to_hash && !diffError"
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
import { formatLoc } from "../format-loc";

const props = defineProps<{
  subdomain: string;
  /** Initial baseline ("before") hash. */
  initialFromHash?: string;
  /** Initial comparison ("after") hash. */
  initialToHash?: string;
}>();

const from_hash = ref(props.initialFromHash ?? "");
const to_hash = ref(props.initialToHash ?? "");

watch(
  () => [props.initialFromHash, props.initialToHash] as const,
  ([from, to]) => {
    if (from) from_hash.value = from;
    if (to) to_hash.value = to;
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
} = useCommitDiff(props.subdomain, from_hash, to_hash);

const diff = computed(() => diffData.value?.commit_diff);

const hasPackageChanges = computed(() => {
  const d = diff.value;
  if (!d) return false;
  return (
    d.package_metrics.added.length +
      d.package_metrics.removed.length +
      d.package_metrics.changed.length >
    0
  );
});

const hasDbSchemaChanges = computed(() => {
  const d = diff.value;
  if (!d) return false;
  const s = d.db_schemas;
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
  { title: "Package", key: "package_name" },
  { title: "File", key: "file_path" },
  { title: "Name", key: "name" },
  { title: "Kind", key: "kind" },
];

const testHeaders = [
  { title: "Change", key: "change" },
  { title: "Package", key: "package_name" },
  { title: "File", key: "file_path" },
  { title: "Full name", key: "full_name" },
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
    ...d.test_cases.added.map((t) => ({ ...t, change: "added" as const })),
    ...d.test_cases.removed.map((t) => ({ ...t, change: "removed" as const })),
  ];
});

const shortHash = (hash: string) => hash.slice(0, 10);
</script>
