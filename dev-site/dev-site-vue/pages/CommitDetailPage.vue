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
          <h2 class="text-h6 mb-2">By package</h2>
          <v-data-table
            v-if="detail.packageMetrics.length > 0"
            :headers="packageHeaders"
            :items="detail.packageMetrics"
            item-value="packageName"
            class="elevation-1 mb-6"
          >
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
            Test cases ({{ detail.testCases.length }})
          </h2>
          <v-data-table
            v-if="detail.testCases.length > 0"
            :headers="testHeaders"
            :items="detail.testCases"
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

const props = defineProps<{
  subdomain: string;
  hash: string;
}>();

const packageHeaders = [
  { title: "Package", key: "packageName" },
  { title: "Directory", key: "directory" },
  { title: "Source files", key: "sourceFiles" },
  { title: "Source LOC", key: "sourceLines" },
  { title: "Prod LOC", key: "prodLines" },
  { title: "Test LOC", key: "testLines" },
  { title: "Test files", key: "testFiles" },
];

const exportHeaders = [
  { title: "Package", key: "packageName" },
  { title: "File", key: "filePath" },
  { title: "Name", key: "name" },
  { title: "Kind", key: "kind" },
];

const testHeaders = [
  { title: "Package", key: "packageName" },
  { title: "File", key: "filePath" },
  { title: "Full name", key: "fullName" },
];

const {
  data,
  isLoading,
  error,
} = useCommit(props.subdomain, toRef(props, "hash"));

const detail = computed(() => data.value?.commitDetail);

const firstLine = (message: string) => message.split("\n")[0] ?? message;
</script>
