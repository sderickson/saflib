<template>
  <v-container>
    <v-row>
      <v-col>
        <div class="d-flex align-center justify-space-between mb-4">
          <h1 class="text-h4">Commit timeline</h1>
          <v-btn
            color="primary"
            :loading="isScanning"
            :disabled="isScanning"
            @click="runScan"
          >
            Scan
          </v-btn>
        </div>

        <v-progress-linear v-if="isLoading" indeterminate class="mb-4" />

        <v-alert v-if="listError" type="error" class="mb-4">
          Error loading commits: {{ listError.message }}
        </v-alert>
        <v-alert v-if="scanError" type="error" class="mb-4">
          Scan failed: {{ scanError.message }}
        </v-alert>
        <v-alert v-if="scanResult" type="success" class="mb-4" density="compact">
          Scanned {{ scanResult.scanned.length }}, skipped
          {{ scanResult.skipped.length }}, failed
          {{ scanResult.failed.length }}.
        </v-alert>

        <v-data-table
          v-if="commits && commits.length > 0"
          :headers="headers"
          :items="commits"
          item-value="hash"
          class="elevation-1"
        >
          <template #[`item.health`]="{ item }">
            <v-chip :color="commitHealth(item).color" size="small">
              {{ commitHealth(item).label }}
            </v-chip>
          </template>

          <template #[`item.hash`]="{ item }">
            <code>{{ shortHash(item.hash) }}</code>
          </template>

          <template #[`item.message`]="{ item }">
            {{ firstLine(item.message) }}
          </template>

          <template #[`item.authoredAt`]="{ item }">
            {{ formatDateTime(item.authoredAt) }}
          </template>

          <template #[`item.summaryMetrics`]="{ item }">
            {{ item.summaryMetrics.sourceLines }} src /
            {{ item.summaryMetrics.testLines }} test LOC ·
            {{ item.summaryMetrics.testCaseCount }} tests ·
            {{ item.summaryMetrics.exportCount }} exports
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn size="small" variant="text" :to="detailTo(item.hash)">
              Detail
            </v-btn>
            <v-btn size="small" variant="text" :to="compareTo(item.hash)">
              Compare
            </v-btn>
          </template>

          <template #bottom></template>
        </v-data-table>

        <p v-else-if="!isLoading && !listError" class="text-body-1">
          No analyzed commits yet. Run a scan to ingest history.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCommits, useScanMutation } from "../requests/queries";
import { commitHealth } from "../health";

const props = defineProps<{
  subdomain: string;
  /** Optional Vue Router path builder for detail links. */
  detailPath?: (hash: string) => string;
  /** Optional Vue Router path builder for compare links (hash as the "to" side). */
  comparePath?: (hash: string) => string;
}>();

const headers = [
  { title: "Health", key: "health", sortable: false },
  { title: "Hash", key: "hash", sortable: false },
  { title: "Message", key: "message", sortable: false },
  { title: "Authored", key: "authoredAt", sortable: false },
  { title: "Metrics", key: "summaryMetrics", sortable: false },
  { title: "Actions", key: "actions", sortable: false },
];

const {
  data: listData,
  isLoading,
  error: listError,
} = useCommits(props.subdomain, { limit: 50 });

const commits = computed(() => listData.value?.commits ?? []);

const {
  mutate: scan,
  isPending: isScanning,
  error: scanError,
  data: scanResult,
} = useScanMutation(props.subdomain);

const runScan = () => {
  scan({});
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

const detailTo = (hash: string) =>
  props.detailPath?.(hash) ?? `/commits/${hash}`;
const compareTo = (hash: string) =>
  props.comparePath?.(hash) ?? `/compare?to=${hash}`;
</script>
