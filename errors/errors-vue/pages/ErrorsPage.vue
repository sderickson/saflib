<template>
  <v-container fluid class="errors-page">
    <v-row>
      <v-col>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <h1 class="text-h4 mb-0">Errors</h1>
          <v-chip size="small" variant="tonal">
            {{ filteredErrors.length }} / {{ reportedErrors.length }}
          </v-chip>
          <v-btn
            size="small"
            variant="tonal"
            :loading="isLoading"
            @click="refetch()"
          >
            Refresh
          </v-btn>
        </div>

        <v-alert v-if="error" type="error" class="mb-4">
          Error loading reported errors: {{ error.message }}
        </v-alert>

        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-select
            v-model="kindFilter"
            label="Kind"
            :items="kindOptions"
            density="compact"
            hide-details
            clearable
            style="min-width: 160px; max-width: 220px"
          />
          <v-text-field
            v-model="sourceFilter"
            label="Filter by source"
            type="search"
            density="compact"
            hide-details
            clearable
            style="min-width: 200px; max-width: 280px"
          />
        </div>

        <v-table density="compact" class="errors-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Kind</th>
              <th>Source</th>
              <th>Message</th>
              <th>Timestamp</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in filteredErrors" :key="entry.id">
              <td>{{ entry.id }}</td>
              <td>
                <v-chip size="x-small" variant="tonal">
                  {{ entry.kind }}
                </v-chip>
              </td>
              <td>{{ entry.source }}</td>
              <td>{{ entry.message }}</td>
              <td>{{ entry.timestamp }}</td>
              <td>
                <pre class="details-json">{{ formatDetails(entry) }}</pre>
              </td>
            </tr>
          </tbody>
        </v-table>

        <p v-if="filteredErrors.length === 0" class="errors-empty">
          No reported errors recorded yet.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { ReportedError } from "@saflib/errors-spec";
import { useListReportedErrors } from "@saflib/errors-sdk";


const kindFilter = ref<ReportedError["kind"] | undefined>();
const sourceFilter = ref("");

const kindOptions = [
  { title: "csp-violation", value: "csp-violation" },
  { title: "client", value: "client" },
  { title: "server", value: "server" },
  { title: "test", value: "test" },
];

const {
  data,
  error,
  isLoading,
  refetch,
} = useListReportedErrors();

const reportedErrors = computed(() => data.value?.reportedErrors ?? []);

const filteredErrors = computed(() => {
  const sourceQuery = sourceFilter.value.trim().toLowerCase();
  return reportedErrors.value.filter((entry) => {
    if (kindFilter.value && entry.kind !== kindFilter.value) {
      return false;
    }
    if (
      sourceQuery &&
      !entry.source.toLowerCase().includes(sourceQuery)
    ) {
      return false;
    }
    return true;
  });
});

function formatDetails(entry: ReportedError): string {
  try {
    return JSON.stringify(
      {
        stack: entry.stack,
        metadata: entry.metadata,
      },
      null,
      2,
    );
  } catch {
    return String(entry.metadata);
  }
}
</script>

<style scoped>
.errors-page {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.errors-table {
  background: rgb(var(--v-theme-surface));
}

.details-json {
  margin: 0;
  max-width: 48rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 11px;
  line-height: 1.35;
}

.errors-empty {
  padding: 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
