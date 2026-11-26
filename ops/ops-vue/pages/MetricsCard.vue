<template>
  <v-card class="pa-4" data-test="diagnostics-metrics">
    <div class="d-flex flex-wrap align-baseline justify-space-between ga-2 mb-3">
      <h2 class="text-subtitle-1 font-weight-medium">
        <code>{{ strings.metrics_title }}</code>
        <span v-if="data" class="text-body-2 text-medium-emphasis">
          · {{ strings.metrics_sub(formatClock(data.started_at), data.metrics.length) }}
        </span>
      </h2>
      <div class="d-flex align-center ga-2">
        <v-text-field
          v-if="!raw"
          v-model="filter"
          :label="strings.metrics_filter"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          style="min-width: 220px"
        />
        <v-btn variant="text" size="small" @click="raw = !raw">{{ raw ? strings.view_table : strings.view_raw }}</v-btn>
      </div>
    </div>
    <v-progress-linear v-if="query.isPending.value" indeterminate />
    <pre v-if="raw && data?.raw" class="metrics-raw">{{ data.raw }}</pre>
    <v-table v-else-if="data" density="compact" class="metrics-table">
      <thead>
        <tr>
          <th>{{ strings.metric_cols.metric }}</th>
          <th>{{ strings.metric_cols.type }}</th>
          <th>{{ strings.metric_cols.distribution }}</th>
          <th>{{ strings.metric_cols.summary }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in rows" :key="m.name" data-test="metric-row">
          <td>
            <code class="text-body-2">{{ m.name }}</code>
            <div class="text-caption text-medium-emphasis">{{ strings.series(m.series) }}</div>
          </td>
          <td class="text-body-2">{{ m.type }}</td>
          <td>
            <div v-if="m.histogram" class="metrics-bars" role="img" :aria-label="`${m.name} buckets`">
              <span
                v-for="b in m.histogram.buckets"
                :key="b.le"
                class="metrics-bar"
                :class="{ 'metrics-bar--p95': b.le === m.histogram.p95_le }"
                :style="{ height: `${barHeight(b.count, m.histogram.buckets)}%` }"
                :title="`≤ ${b.le}: ${b.count}`"
              />
            </div>
            <span v-else class="text-body-2">{{ formatNumber(m.total) }}</span>
          </td>
          <td class="text-caption text-medium-emphasis">
            <template v-if="m.histogram">
              {{ formatNumber(m.histogram.count) }} obs · mean
              {{ formatNumber(m.histogram.count ? m.histogram.sum / m.histogram.count : null) }} · p95 ≤
              {{ m.histogram.p95_le ?? "—" }}
            </template>
            <template v-else>{{ m.help }}</template>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useOpsDiagnosticMetrics } from "../requests/queries.ts";
import { ops_diagnostics as strings } from "./Diagnostics.strings.ts";

const raw = ref(false);
const filter = ref("");
const query = useOpsDiagnosticMetrics(raw);
const data = computed(() => query.data.value);
const rows = computed(() => {
  const f = (filter.value ?? "").trim().toLowerCase();
  return (data.value?.metrics ?? []).filter((m) => !f || m.name.toLowerCase().includes(f));
});

const barHeight = (count: number, buckets: { count: number }[]) => {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return Math.max(4, Math.round((count / max) * 100));
};
const formatNumber = (n: number | null | undefined) =>
  n == null ? "—" : Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumSignificantDigits: 3 });
const formatClock = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
</script>

<style scoped>
.metrics-raw {
  max-height: 480px;
  overflow: auto;
  font-size: 0.75rem;
  white-space: pre;
}
.metrics-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 28px;
  min-width: 120px;
}
.metrics-bar {
  flex: 1 1 0;
  min-width: 4px;
  background: rgba(var(--v-theme-primary), 0.35);
  border-radius: 1px;
}
.metrics-bar--p95 {
  background: rgb(var(--v-theme-primary));
}
</style>
