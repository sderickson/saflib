<template>
  <v-container fluid class="metrics-page">
    <v-row>
      <v-col>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <h1 class="text-h4 mb-0">Metrics</h1>
          <v-chip size="small" variant="tonal">
            {{ filteredMetrics.length }} / {{ metrics.length }}
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
          Error loading metrics: {{ error.message }}
        </v-alert>

        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-select
            v-model="selectedName"
            :items="nameOptions"
            label="Metric"
            density="compact"
            hide-details
            clearable
            style="min-width: 220px; max-width: 320px"
          />
          <v-select
            v-model="splitLabel"
            :items="labelKeyOptions"
            label="Split by label"
            density="compact"
            hide-details
            clearable
            style="min-width: 180px; max-width: 240px"
          />
        </div>

        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-text-field
            v-for="(filter, index) in labelFilters"
            :key="index"
            v-model="filter.labelValue"
            :label="filter.labelKey || 'Label value'"
            density="compact"
            hide-details
            clearable
            style="min-width: 160px; max-width: 220px"
          />
          <v-select
            v-model="newFilterKey"
            :items="labelKeyOptions"
            label="Add label filter"
            density="compact"
            hide-details
            clearable
            style="min-width: 180px; max-width: 240px"
            @update:model-value="addLabelFilter"
          />
        </div>

        <div v-for="group in groupedMetrics" :key="group.groupLabel" class="mb-6">
          <h2 v-if="splitLabel" class="text-h6 mb-2">{{ group.groupLabel }}</h2>

          <v-table density="compact" class="metrics-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Labels</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in group.metrics" :key="rowKey(row)">
                <td>{{ row.name }}</td>
                <td>{{ row.type }}</td>
                <td class="labels-cell">{{ formatLabels(row.labels) }}</td>
                <td>
                  <template v-if="row.type === 'histogram'">
                    <div class="text-medium-emphasis mb-1">
                      {{ formatMetricValue(row) }}
                    </div>
                    <v-table density="compact" class="bucket-table">
                      <thead>
                        <tr>
                          <th>le</th>
                          <th>count</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="bucket in row.buckets ?? []" :key="bucket.le">
                          <td>{{ bucket.le }}</td>
                          <td>{{ bucket.count }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </template>
                  <template v-else>
                    {{ formatMetricValue(row) }}
                  </template>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <p v-if="filteredMetrics.length === 0 && !isLoading" class="text-medium-emphasis">
          No metrics match the current filters.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { MetricSnapshot } from "@saflib/node-metrics-spec";
import { useGetMetricsSnapshot } from "@saflib/node-metrics-sdk";
import {
  filterMetrics,
  formatMetricValue,
  groupMetricsByLabel,
  metricLabelKey,
  uniqueLabelKeys,
  uniqueMetricNames,
  type MetricFilter,
} from "./MetricsPage.logic.ts";

const props = withDefaults(
  defineProps<{
    /** API subdomain (typically `api`). */
    subdomain?: string;
  }>(),
  { subdomain: "api" },
);

const selectedName = ref<string | null>(null);
const splitLabel = ref<string | null>(null);
const labelFilters = ref<MetricFilter[]>([]);
const newFilterKey = ref<string | null>(null);

const {
  data,
  error,
  isLoading,
  refetch,
} = useGetMetricsSnapshot(props.subdomain);

const metrics = computed<MetricSnapshot[]>(() => data.value?.metrics ?? []);

const nameOptions = computed(() => uniqueMetricNames(metrics.value));
const labelKeyOptions = computed(() => uniqueLabelKeys(metrics.value));

watch(nameOptions, (names) => {
  if (selectedName.value && !names.includes(selectedName.value)) {
    selectedName.value = null;
  }
});

watch(labelKeyOptions, (keys) => {
  labelFilters.value = labelFilters.value.filter((f) => keys.includes(f.labelKey));
  if (splitLabel.value && !keys.includes(splitLabel.value)) {
    splitLabel.value = null;
  }
});

const filteredMetrics = computed(() =>
  filterMetrics(metrics.value, selectedName.value, labelFilters.value),
);

const groupedMetrics = computed(() =>
  groupMetricsByLabel(filteredMetrics.value, splitLabel.value),
);

function addLabelFilter(key: string | null) {
  newFilterKey.value = null;
  if (!key) return;
  if (labelFilters.value.some((f) => f.labelKey === key)) return;
  labelFilters.value.push({ labelKey: key, labelValue: "" });
}

function formatLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}="${v}"`).join(", ");
}

function rowKey(metric: MetricSnapshot): string {
  return `${metric.name}|${metric.type}|${metricLabelKey(metric.labels)}`;
}
</script>

<style scoped>
.metrics-page {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.metrics-table,
.bucket-table {
  background: rgb(var(--v-theme-surface));
}

.labels-cell {
  white-space: normal;
  word-break: break-word;
  max-width: 420px;
}

.bucket-table {
  max-width: 240px;
}
</style>
