<template>
  <v-container>
    <v-row>
      <v-col>
        <h1 class="text-h4 mb-2">Commit detail</h1>
        <p class="text-body-2 text-medium-emphasis mb-4">
          <code>{{ hash }}</code>
          <span v-if="detail"> — {{ firstLine(detail.commit.message) }}</span>
        </p>

        <v-progress-linear v-if="isLoading" indeterminate class="mb-4" />

        <v-alert v-if="error" type="error" class="mb-4">
          Error loading commit: {{ error.message }}
        </v-alert>

        <template v-if="detail">
          <h2 class="text-h6 mb-2">By package (debt hotspots first)</h2>
          <v-data-table
            v-if="sortedPackages.length > 0"
            :headers="packageHeaders"
            :items="sortedPackages"
            item-value="package_name"
            class="elevation-1 mb-6"
          >
            <template #[`item.debt_count`]="{ item }">
              <strong>{{ item.debt_count }}</strong>
            </template>
            <template #[`item.issueBreakdown`]="{ item }">
              <span class="text-caption">
                d{{ item.issue_counts_by_kind["dead-code"] }} · o{{
                  item.issue_counts_by_kind["oversized-file"]
                }}
                · l{{ item.issue_counts_by_kind["package-layout"] }}
              </span>
            </template>
            <template #[`item.source_lines`]="{ item }">
              {{ formatLoc(item.source_lines) }}
            </template>
            <template #[`item.prod_lines`]="{ item }">
              {{ formatLoc(item.prod_lines) }}
            </template>
            <template #[`item.test_lines`]="{ item }">
              {{ formatLoc(item.test_lines) }}
            </template>
            <template #bottom></template>
          </v-data-table>
          <p v-else class="text-body-2 mb-6">No package metrics.</p>

          <h2 class="text-h6 mb-2">Exports ({{ detail.exports.length }})</h2>
          <v-data-table
            v-if="detail.exports.length > 0"
            :headers="exportHeaders"
            :items="detail.exports"
            class="elevation-1 mb-6"
          >
            <template #bottom></template>
          </v-data-table>
          <p v-else class="text-body-2 mb-6">No exports found.</p>

          <h2 class="text-h6 mb-2">
            Test cases ({{ detail.test_cases.length }})
          </h2>
          <v-data-table
            v-if="detail.test_cases.length > 0"
            :headers="testHeaders"
            :items="detail.test_cases"
            class="elevation-1"
          >
            <template #bottom></template>
          </v-data-table>
          <p v-else class="text-body-2">No test cases found.</p>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue";
import { useCommit } from "../requests/queries";
import { formatLoc } from "../format-loc";

const props = defineProps<{
  subdomain: string;
  hash: string;
}>();

const packageHeaders = [
  { title: "Debt", key: "debt_count" },
  { title: "Breakdown", key: "issueBreakdown", sortable: false },
  { title: "Package", key: "package_name" },
  { title: "Directory", key: "directory" },
  { title: "Source files", key: "source_files" },
  { title: "Source LOC", key: "source_lines" },
  { title: "Prod LOC", key: "prod_lines" },
  { title: "Test LOC", key: "test_lines" },
  { title: "Test files", key: "test_files" },
];

const exportHeaders = [
  { title: "Package", key: "package_name" },
  { title: "File", key: "file_path" },
  { title: "Name", key: "name" },
  { title: "Kind", key: "kind" },
  { title: "Signature", key: "signature" },
];

const testHeaders = [
  { title: "Package", key: "package_name" },
  { title: "File", key: "file_path" },
  { title: "Full name", key: "full_name" },
  { title: "Subject", key: "subject_name" },
  { title: "Signature", key: "subject_signature" },
];

const {
  data,
  isLoading,
  error,
} = useCommit(props.subdomain, toRef(props, "hash"));

const detail = computed(() => data.value?.commit_detail);

const sortedPackages = computed(() => {
  const rows = detail.value?.package_metrics ?? [];
  return [...rows].sort(
    (a, b) =>
      (b.debt_count ?? 0) - (a.debt_count ?? 0) ||
      a.package_name.localeCompare(b.package_name),
  );
});

const firstLine = (message: string) => message.split("\n")[0] ?? message;
</script>
