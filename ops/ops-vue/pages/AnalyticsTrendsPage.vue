<template>
  <ContentWidth variant="full">
    <v-alert v-if="metricsOff" type="info" variant="tonal" density="compact" class="mb-4" data-test="trends-off">
      {{ strings.trends_off }}
    </v-alert>
    <template v-else>
      <div class="d-flex align-center ga-2 mb-4">
        <span class="text-body-2 text-medium-emphasis">{{ strings.range }}</span>
        <v-chip-group v-model="days" mandatory selected-class="text-primary" data-test="trends-range">
          <v-chip v-for="d in [7, 30, 90]" :key="d" :value="d" size="small" variant="outlined">{{ d }}d</v-chip>
        </v-chip-group>
      </div>
      <AdminPanel>
        <v-progress-linear v-if="totals.isPending.value" indeterminate />
        <p v-else-if="!events.length" class="saf-admin-empty pa-4 ma-0">{{ strings.no_events }}</p>
        <v-table v-else>
          <thead>
            <tr>
              <th>{{ strings.event_col }}</th>
              <th class="text-end">{{ strings.total_col }}</th>
              <th class="trends-spark-col saf-admin-hide-xs">{{ strings.trend_col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events" :key="e.event" data-test="trends-row">
              <td><code>{{ e.event }}</code></td>
              <td class="text-end">{{ compactNumber(e.total) }}</td>
              <td class="trends-spark-col saf-admin-hide-xs py-2">
                <OpsSparkChart :key="`${e.event}|${days}`" title="" :query="sparkQuery(e.event)" :hours="days * 24" :height="40" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </AdminPanel>
    </template>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { AdminPanel, ContentWidth } from "@saflib/vue/components";
import { useOpsDigest, useOpsMetricsInstant } from "../requests/queries.ts";
import OpsSparkChart from "../components/OpsSparkChart.vue";
import { compactNumber } from "../components/compact-number.ts";
import { ops_analytics as strings } from "./Analytics.strings.ts";

const digest = useOpsDigest();
const metricsOff = computed(() => {
  const d = digest.data.value?.digest;
  return !!d && !d.metrics;
});

const days = ref(30);
const totalsQuery = computed(() =>
  metricsOff.value ? "" : `sort_desc(sum by (event) (increase(saf_product_events_total[${days.value}d])))`,
);
const totals = useOpsMetricsInstant(totalsQuery);
const events = computed(() =>
  ((totals.data.value?.metrics.result ?? []) as { metric?: Record<string, string>; value?: [number, string] }[])
    .map((r) => ({ event: r.metric?.event ?? "?", total: Math.round(Number(r.value?.[1] ?? 0)) }))
    .filter((e) => e.total > 0),
);

// One point per ~1/120th of the range; each point counts events in its own window.
const sparkQuery = (event: string) => {
  const windowSec = Math.max(300, Math.floor((days.value * 86400) / 120));
  const escaped = event.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `sum(increase(saf_product_events_total{event="${escaped}"}[${windowSec}s]))`;
};
</script>

<style scoped>
.trends-spark-col {
  width: 45%;
  min-width: 200px;
}
</style>
