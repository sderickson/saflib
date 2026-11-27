<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-4">{{ strings.title }}</AdminPageTitle>

    <v-alert v-if="metricsOff" type="info" variant="tonal" density="compact" class="mb-4" data-test="metrics-off">
      {{ strings.off }}
    </v-alert>

    <div class="metrics-layout">
      <v-select
        v-if="!mdAndUp"
        :model-value="applied.query"
        :items="presetItems"
        :label="strings.presets"
        class="metrics-preset-select"
        data-test="metric-preset-select"
        @update:model-value="(q) => pickQuery(q)"
      />
      <AdminPanel v-else class="metrics-presets" :title="strings.presets">
        <nav :aria-label="strings.presets">
          <div v-for="group in groups" :key="group.name" class="metrics-presets__group">
            <div class="metrics-presets__label">{{ group.name }}</div>
            <button
              v-for="p in group.presets"
              :key="p.label"
              type="button"
              class="metrics-presets__item"
              :class="{ 'metrics-presets__item--active': p.query === applied.query }"
              :aria-pressed="p.query === applied.query"
              data-test="metric-preset"
              @click="pick(p)"
            >
              {{ p.label }}
            </button>
          </div>
        </nav>
      </AdminPanel>

      <div class="metrics-main">
        <AdminPanel :title="applied.title">
          <template #actions>
            <v-btn-toggle v-model="hours" mandatory density="compact" variant="outlined" divided>
              <v-btn v-for="r in ranges" :key="r.label" :value="r.hours" size="small">{{ r.label }}</v-btn>
            </v-btn-toggle>
          </template>
          <div class="metrics-query">
            <v-form class="d-flex align-start ga-2" @submit.prevent="run">
              <v-textarea
                v-model="draft"
                :placeholder="strings.queryLabel"
                rows="1"
                auto-grow
                class="promql"
                data-test="metric-query"
                @keydown.enter.exact.prevent="run"
              />
              <v-btn type="submit" color="primary" variant="flat" :disabled="metricsOff" data-test="metric-run">{{ strings.run }}</v-btn>
            </v-form>
            <div v-if="metricsOff" class="metrics-placeholder">{{ strings.graph_off }}</div>
            <OpsSparkChart
              v-else-if="applied.query"
              :key="`${applied.query}|${applied.hours}`"
              :query="applied.query"
              :title="applied.title"
              :hours="applied.hours"
              :unit="unit ?? 'count'"
              :width="960"
              :height="200"
              class="metrics-graph"
            />
          </div>
        </AdminPanel>

        <AdminPanel v-if="applied.query" :title="strings.current">
          <p v-if="metricsOff" class="text-body-2 text-medium-emphasis pa-4 ma-0">{{ strings.values_off }}</p>
          <v-alert v-else-if="instant.error.value" type="error" variant="tonal" density="compact" class="ma-3" data-test="metric-error">
            {{ instant.error.value.message }}
          </v-alert>
          <p v-else-if="rows.length === 0 && !instant.isFetching.value" class="text-body-2 text-medium-emphasis pa-4 ma-0">
            {{ strings.noSeries }}
          </p>
          <v-table v-else>
            <thead>
              <tr><th>{{ strings.series }}</th><th class="text-right">{{ strings.value }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="i" data-test="metric-row">
                <td><code class="metrics-series">{{ r.label }}</code></td>
                <td class="text-right">{{ r.value }}</td>
              </tr>
            </tbody>
          </v-table>
        </AdminPanel>
      </div>
    </div>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { AdminPageTitle, AdminPanel, ContentWidth } from "@saflib/vue/components";
import OpsSparkChart from "../components/OpsSparkChart.vue";
import { useOpsDigest, useOpsMetricsInstant } from "../requests/queries.ts";
import { METRIC_PRESETS, METRIC_RANGES, type MetricPreset } from "./OpsMetrics.presets.ts";
import { ops_metrics as strings } from "./OpsMetrics.strings.ts";

const route = useRoute();
const router = useRouter();
const ranges = METRIC_RANGES;

const groups = computed(() => {
  const byGroup = new Map<string, MetricPreset[]>();
  for (const p of METRIC_PRESETS) byGroup.set(p.group, [...(byGroup.get(p.group) ?? []), p]);
  return [...byGroup].map(([name, presets]) => ({ name, presets }));
});

// The view lives in the URL (?q=&hours=), so it can be bookmarked or shared.
const initialQuery = typeof route.query.q === "string" ? route.query.q : METRIC_PRESETS[0]!.query;
const initialHours = Number(route.query.hours) || 24;
const draft = ref(initialQuery);
const hours = ref<number>(METRIC_RANGES.some((r) => r.hours === initialHours) ? initialHours : 24);
const applied = ref({ query: initialQuery, hours: hours.value, title: titleFor(initialQuery) });

function titleFor(query: string): string {
  return METRIC_PRESETS.find((p) => p.query === query)?.label ?? "Custom query";
}

function run() {
  const query = draft.value.trim();
  if (!query) return;
  applied.value = { query, hours: hours.value, title: titleFor(query) };
  void router.replace({ query: { ...route.query, q: query, hours: String(hours.value) } });
}

const { mdAndUp } = useDisplay();
const presetItems = computed(() =>
  groups.value.flatMap((g) => g.presets.map((p) => ({ title: `${g.name}: ${p.label}`, value: p.query }))),
);
function pickQuery(q: unknown) {
  const p = METRIC_PRESETS.find((x) => x.query === q);
  if (p) pick(p);
}

function pick(p: MetricPreset) {
  draft.value = p.query;
  run();
}

watch(hours, () => run());

// Without Prometheus (dev, or a product with metrics off) say so once,
// rather than a red error under every query.
const digest = useOpsDigest();
const metricsOff = computed(() => {
  const d = digest.data.value?.digest;
  return !!d && !d.metrics;
});
// Nothing to query without Prometheus; the page still shows what's there.
const appliedQuery = computed(() => (digest.data.value && !metricsOff.value ? applied.value.query : ""));

const instant = useOpsMetricsInstant(appliedQuery);

const unit = computed(() => METRIC_PRESETS.find((p) => p.query === applied.value.query)?.unit);

function formatValue(raw: unknown): string {
  const v = Number(raw);
  if (!Number.isFinite(v)) return String(raw);
  switch (unit.value) {
    case "percent":
      return `${v.toFixed(2)}%`;
    case "seconds":
      return v < 1 ? `${(v * 1000).toFixed(1)} ms` : `${v.toFixed(2)} s`;
    case "bytes":
      return `${(v / 1024 / 1024).toFixed(1)} MB`;
    case "count":
      return v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2);
    default:
      return Number.isInteger(v) ? v.toLocaleString() : v.toPrecision(4);
  }
}

/** One row per series, labelled by the labels that matter (not the scrape's identity). */
const rows = computed(() => {
  const result = instant.data.value?.metrics.result ?? [];
  return result
    .map((r) => {
      const labels = Object.entries(r.metric ?? {})
        .filter(([k]) => !["__name__", "saf_app", "job", "instance"].includes(k))
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      const raw = r.value?.[1];
      return { label: labels || r.metric?.__name__ || "value", value: formatValue(raw), sort: Number(raw) };
    })
    .sort((a, b) => (Number.isFinite(b.sort) ? b.sort : -Infinity) - (Number.isFinite(a.sort) ? a.sort : -Infinity));
});
</script>

<style scoped>
.metrics-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
@media (max-width: 960px) {
  .metrics-layout {
    grid-template-columns: 1fr;
  }
}
.metrics-main {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.metrics-presets nav {
  padding: 8px;
}
.metrics-presets__group + .metrics-presets__group {
  margin-top: 8px;
}
.metrics-presets__label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  padding: 4px 8px;
}
.metrics-presets__item {
  appearance: none;
  background: transparent;
  border: 0;
  box-shadow: none;
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  font-size: 0.8125rem;
  padding: 5px 8px;
  border-radius: 6px;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}
.metrics-presets__item:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.metrics-presets__item--active {
  background: rgb(var(--v-theme-secondary-container));
  font-weight: 500;
}
.metrics-query {
  padding: 12px 16px 16px;
}
.metrics-placeholder {
  margin-top: 12px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #ddd6bf;
  border-radius: 6px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
}
.metrics-graph {
  margin-top: 12px;
}
.metrics-graph :deep(img) {
  width: 100%;
  height: auto;
}
.metrics-series {
  font-size: 0.75rem;
}
.promql :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
}
</style>
