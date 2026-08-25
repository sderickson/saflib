<template>
  <ContentWidth variant="full" class="metrics-page">
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <h1 class="text-h4 mb-0">Metrics</h1>
          <v-chip size="small" variant="tonal">
            {{ displayRowCount }} / {{ metrics.length }}
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
            :items="splitLabelOptions"
            label="Split by label"
            density="compact"
            hide-details
            clearable
            :disabled="!selectedName"
            style="min-width: 180px; max-width: 240px"
          />
        </div>

        <div v-if="selectedName" class="d-flex flex-wrap ga-2 mb-4">
          <div
            v-for="filter in labelFilters"
            :key="filter.labelKey"
            class="d-flex align-center ga-1"
          >
            <v-text-field
              v-model="filter.labelValue"
              :label="filter.labelKey"
              density="compact"
              hide-details
              clearable
              style="min-width: 160px; max-width: 220px"
              @click:clear="removeLabelFilter(filter.labelKey)"
            />
          </div>
          <v-select
            v-model="newFilterKey"
            :items="availableFilterKeys"
            label="Add label filter"
            density="compact"
            hide-details
            clearable
            style="min-width: 180px; max-width: 240px"
            @update:model-value="addLabelFilter"
          />
        </div>

        <div
          v-for="group in displayGroups"
          :key="group.groupLabel ?? 'all'"
          class="mb-6"
        >
          <h2 v-if="group.groupLabel" class="text-h6 mb-2">
            {{ splitLabel }}={{ group.groupLabel }}
          </h2>

          <v-table density="compact" class="metrics-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th class="value-col">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in group.rows" :key="row.key">
                <td class="metric-cell">
                  <div class="metric-head">
                    <span class="metric-name">{{ row.name }}</span>
                    <v-chip
                      size="x-small"
                      variant="tonal"
                      class="metric-type-pill"
                    >
                      {{ row.type }}
                    </v-chip>
                  </div>
                  <div
                    v-if="labelValueRows(row.series).length > 0"
                    class="metric-labels"
                  >
                    <div
                      v-for="labelRow in labelValueRows(row.series)"
                      :key="labelRow.key"
                      class="label-row"
                    >
                      <span class="label-key">{{ labelRow.key }}:</span>
                      {{ labelRow.values }}
                    </div>
                  </div>
                </td>
                <td class="value-cell">
                  <template v-if="row.type === 'histogram'">
                    <table class="histogram-table">
                      <tbody>
                        <tr>
                          <th
                            v-for="bucket in sortedHistogramBuckets(
                              aggregatedMetric(row.series).buckets,
                            )"
                            :key="bucket.le"
                            class="histogram-bucket-le"
                          >
                            ≤ {{ bucket.le }}
                          </th>
                        </tr>
                        <tr>
                          <td
                            v-for="bucket in sortedHistogramBuckets(
                              aggregatedMetric(row.series).buckets,
                            )"
                            :key="`${bucket.le}-count`"
                            class="histogram-bucket-count"
                          >
                            {{ bucket.count }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p class="histogram-stats">
                      {{ histogramStatsText(aggregatedMetric(row.series)) }}
                    </p>
                  </template>
                  <template v-else>
                    {{ formatAggregatedValue(row.series) }}
                  </template>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <p v-if="displayRowCount === 0 && !isLoading" class="text-medium-emphasis">
          No metrics match the current filters.
        </p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import type { MetricSnapshot } from "@saflib/node-metrics-spec";
import { useGetMetricsSnapshot } from "@saflib/node-metrics-sdk";
import {
  aggregateMetricSeries,
  buildMetricDisplayGroups,
  filterMetrics,
  formatAggregatedValue,
  histogramStatsText,
  labelKeysForMetric,
  labelValueRows,
  sortedHistogramBuckets,
  uniqueMetricNames,
  type MetricFilter,
} from "./MetricsPage.logic.ts";


const selectedName = ref<string | null>(null);
const splitLabel = ref<string | null>(null);
const labelFilters = ref<MetricFilter[]>([]);
const newFilterKey = ref<string | null>(null);

const {
  data,
  error,
  isLoading,
  refetch,
} = useGetMetricsSnapshot();

const metrics = computed<MetricSnapshot[]>(() => data.value?.metrics ?? []);

const nameOptions = computed(() => uniqueMetricNames(metrics.value));
const splitLabelOptions = computed(() =>
  selectedName.value
    ? labelKeysForMetric(metrics.value, selectedName.value)
    : [],
);

const availableFilterKeys = computed(() =>
  splitLabelOptions.value.filter(
    (key) => !labelFilters.value.some((f) => f.labelKey === key),
  ),
);

watch(nameOptions, (names) => {
  if (selectedName.value && !names.includes(selectedName.value)) {
    selectedName.value = null;
  }
});

watch(selectedName, (name) => {
  if (!name) {
    splitLabel.value = null;
    labelFilters.value = [];
  } else if (splitLabel.value && !splitLabelOptions.value.includes(splitLabel.value)) {
    splitLabel.value = null;
  }
  labelFilters.value = labelFilters.value.filter((f) =>
    splitLabelOptions.value.includes(f.labelKey),
  );
});

const filteredMetrics = computed(() =>
  filterMetrics(metrics.value, selectedName.value, labelFilters.value),
);

const displayGroups = computed(() =>
  buildMetricDisplayGroups(
    filteredMetrics.value,
    selectedName.value,
    splitLabel.value,
  ),
);

const displayRowCount = computed(() =>
  displayGroups.value.reduce((n, g) => n + g.rows.length, 0),
);

function aggregatedMetric(series: MetricSnapshot[]) {
  return aggregateMetricSeries(series);
}

function addLabelFilter(key: string | null) {
  newFilterKey.value = null;
  if (!key) return;
  if (labelFilters.value.some((f) => f.labelKey === key)) return;
  labelFilters.value.push({ labelKey: key, labelValue: "" });
}

function removeLabelFilter(labelKey: string) {
  labelFilters.value = labelFilters.value.filter((f) => f.labelKey !== labelKey);
}
</script>

<style scoped>
.metrics-page {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.metrics-table {
  background: rgb(var(--v-theme-surface));
}

.metrics-table :deep(thead th) {
  padding: 0.65rem 1rem;
}

.metrics-table :deep(tbody td) {
  padding: 0.85rem 1rem;
}

.metrics-table :deep(th.value-col),
.value-cell {
  width: 40%;
  vertical-align: top;
}

.metric-cell {
  vertical-align: top;
  max-width: 0;
  width: 60%;
}

.metric-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.metric-name {
  font-weight: 600;
  word-break: break-word;
}

.metric-type-pill {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  text-transform: lowercase;
}

.metric-labels {
  margin-top: 0.35rem;
  padding-top: 0.35rem;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.label-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-row + .label-row {
  margin-top: 0.15rem;
}

.label-key {
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.histogram-table {
  border-collapse: collapse;
  margin-bottom: 0.35rem;
  max-width: 100%;
  overflow-x: auto;
}

.histogram-table th,
.histogram-table td {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 0.15rem 0.45rem;
  text-align: center;
  white-space: nowrap;
}

.histogram-bucket-le {
  font-weight: 600;
  font-size: 11px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.histogram-bucket-count {
  font-variant-numeric: tabular-nums;
}

.histogram-stats {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.75;
  font-size: 11px;
}
</style>
