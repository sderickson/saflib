<template>
  <ContentWidth variant="full">
    <div class="d-flex flex-wrap align-baseline justify-space-between ga-2 mb-4">
      <h1 class="text-h4">{{ strings.title }}</h1>
      <div class="d-flex align-center ga-3 text-body-2 text-medium-emphasis">
        <span v-if="digest">{{ strings.checked }} {{ formatClock(digest.generated_at) }}</span>
        <v-btn variant="text" size="small" :loading="query.isFetching.value" @click="query.refetch()">
          {{ strings.refresh }}
        </v-btn>
      </div>
    </div>

    <v-alert v-if="query.error.value" type="error" variant="tonal" class="mb-4">
      {{ query.error.value.message }}
    </v-alert>
    <v-skeleton-loader v-else-if="!digest" type="article" />

    <template v-if="digest">
      <AdminPanel class="mb-6">
        <table class="overview-table" data-test="overview-table">
          <tbody v-for="group in groups" :key="group.key">
            <tr class="overview-table__group">
              <th colspan="3" scope="colgroup">{{ group.label }}</th>
            </tr>
            <tr
              v-for="tile in group.tiles"
              :key="tile.key"
              class="overview-row"
              :class="`overview-row--${tile.tone}`"
              data-test="overview-tile"
              :data-tone="tile.tone"
            >
              <td class="overview-row__icon"><StatusIcon :tone="tile.tone" /></td>
              <th scope="row" class="overview-row__label">
                <router-link v-if="linkFor(tile.key)" :to="linkFor(tile.key)!">{{ tile.label }}</router-link>
                <span v-else>{{ tile.label }}</span>
              </th>
              <td class="overview-row__note">
                <template v-if="tile.tone !== 'ok' || tile.always_show">
                  <span class="overview-row__value">{{ tile.value }}</span>
                  <span v-if="tile.detail" class="text-medium-emphasis"> · {{ tile.detail }}</span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </AdminPanel>

      <section class="mb-6" :aria-label="graphsTitle">
        <div class="d-flex justify-space-between align-baseline mb-2">
          <h2 class="overview-heading">{{ graphsTitle }}</h2>
          <router-link v-if="links.metrics && metricsOn" :to="links.metrics" class="text-body-2">{{ strings.open_metrics }}</router-link>
        </div>
        <div v-if="metricsOn" class="overview-graphs">
          <OpsGraph :title="strings.requests" :query="GRAPH_REQUESTS" :width="420" :height="160" />
          <OpsGraph :title="strings.p95" :query="GRAPH_P95" :width="420" :height="160" />
          <OpsGraph :title="strings.memory" :query="GRAPH_MEMORY" :width="420" :height="160" />
        </div>
        <div v-else class="overview-graphs" data-test="overview-since-start">
          <v-card v-for="n in sinceStart" :key="n.label" variant="outlined" class="pa-3">
            <div class="text-body-2 text-medium-emphasis">{{ n.label }}</div>
            <div class="text-h5 font-weight-bold">{{ n.value }}</div>
            <div class="text-caption text-medium-emphasis">{{ n.note }}</div>
          </v-card>
        </div>
      </section>

      <div class="overview-footer d-flex flex-wrap align-center justify-space-between ga-3">
        <span class="text-body-2 text-medium-emphasis d-flex flex-wrap align-center ga-2">
          {{ strings.builds }}:
          <template v-for="c in [build.root, build.saflib]" :key="c.label">
            <span>
              {{ c.label }}
              <a v-if="c.href" :href="c.href" target="_blank" rel="noopener noreferrer"><code>{{ c.shortSha }}</code></a>
              <code v-else>{{ c.shortSha }}</code>
            </span>
          </template>
        </span>
        <router-link v-if="links.diagnostics" :to="links.diagnostics" class="text-body-2">{{ strings.self_test }}</router-link>
      </div>
    </template>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { AdminPanel, ContentWidth } from "@saflib/vue/components";
import StatusIcon from "./StatusIcon.vue";
import { LEAST_RELIABLE_ENDPOINTS_QUERY, SLOWEST_ENDPOINTS_QUERY } from "../pages/OpsMetrics.presets.ts";
import { useOpsDigest } from "../requests/queries.ts";
import OpsGraph from "./OpsGraph.vue";
import { getBuildCommits, type BuildRepoUrls } from "./build-info.ts";
import { ops_overview as strings } from "./OpsOverview.strings.ts";

const props = withDefaults(
  defineProps<{
    /**
     * Where each tile leads, by tile key (`issues`, `jobs`,
     * `whatsapp-inbox`, …), plus `metrics` and `diagnostics`.
     */
    links?: Partial<Record<string, RouteLocationRaw>>;
    repos?: BuildRepoUrls;
  }>(),
  { links: () => ({}) },
);

const GRAPH_REQUESTS = 'sum(rate(http_request_duration_seconds_count{path!="unspecified"}[5m])) * 60';
const GRAPH_P95 = 'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{path!="unspecified"}[5m])))';
const GRAPH_MEMORY = 'process_resident_memory_bytes{saf_app!="host"}';

const query = useOpsDigest();
const digest = computed(() => query.data.value?.digest);

// Endpoint rows open Metrics on the matching ranked query.
const endpointQueries: Record<string, string> = {
  "slowest-endpoint": SLOWEST_ENDPOINTS_QUERY,
  "least-available-endpoint": LEAST_RELIABLE_ENDPOINTS_QUERY,
};
const linkFor = (key: string): RouteLocationRaw | undefined => {
  const q = endpointQueries[key];
  const metrics = props.links.metrics;
  if (q && typeof metrics === "string") return `${metrics}?q=${encodeURIComponent(q)}`;
  return props.links[key];
};

const groups = computed(() => {
  const tiles = digest.value?.tiles ?? [];
  return [
    { key: "system", label: strings.system, tiles: tiles.filter((t) => t.group === "system") },
    { key: "traffic", label: strings.traffic, tiles: tiles.filter((t) => t.group === "traffic") },
    { key: "customers", label: strings.customers, tiles: tiles.filter((t) => t.group === "customers") },
  ].filter((g) => g.tiles.length > 0);
});

const metricsOn = computed(() => !!digest.value?.metrics && !digest.value.metrics.error);
const graphsTitle = computed(() =>
  metricsOn.value || !digest.value
    ? strings.last_24h
    : strings.since_start(formatClock(digest.value.process.started_at)),
);

const formatBytes = (n: number | null) => (n == null ? "—" : `${Math.round(n / 1024 / 1024)} MB`);
const sinceStart = computed(() => {
  const p = digest.value?.process;
  if (!p) return [];
  return [
    { label: strings.requests, value: p.requests_total.toLocaleString(), note: strings.since_start_note },
    { label: strings.p95, value: p.p95_upper_ms == null ? "—" : `≤ ${p.p95_upper_ms} ms`, note: strings.p95_note },
    { label: strings.memory, value: formatBytes(p.rss_bytes), note: strings.right_now },
  ];
});

const build = computed(() => getBuildCommits(props.repos));

const formatClock = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
</script>

<style scoped>
.overview-heading {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.overview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.overview-table__group th {
  text-align: left;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  padding: 14px 16px 6px;
}
.overview-row td,
.overview-row th {
  padding: 8px 16px;
  border-top: 1px solid var(--saf-admin-row-border, #f2eee2);
  vertical-align: middle;
  text-align: left;
}
.overview-row__icon {
  width: 44px;
  padding-right: 0 !important;
}
.overview-row__label {
  font-weight: 500;
  white-space: nowrap;
  width: 220px;
}
.overview-row__label a {
  color: inherit;
  text-decoration: none;
}
.overview-row__label a:hover {
  text-decoration: underline;
}
.overview-row__value {
  font-weight: 500;
}
.overview-row--bad .overview-row__value {
  color: rgb(var(--v-theme-error));
}
.overview-graphs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.overview-footer {
  padding: 4px 2px;
}
</style>
