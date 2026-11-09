<template>
  <div class="ops-digest">
    <v-skeleton-loader v-if="!digest" type="article" />
    <template v-else>
      <v-alert
        :type="digest.summary.needs_attention ? 'warning' : 'success'"
        variant="tonal"
        density="compact"
        class="mb-4"
        data-test="digest-status"
      >
        {{ digest.summary.needs_attention ? strings.needsAttention : strings.allClear }}
      </v-alert>

      <v-row dense>
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="pa-3 h-100">
            <div class="text-subtitle-2 mb-2">{{ strings.health }}</div>
            <div v-if="digest.health.failing.length === 0" class="d-flex align-center ga-2 mb-1">
              <v-icon color="success" size="small" icon="mdi-check-circle" />
              <span>{{ strings.healthOk }}</span>
            </div>
            <div v-for="c in digest.health.failing" :key="c.name" class="d-flex align-center ga-2 mb-1">
              <v-icon :color="statusColor(c.status)" size="small" :icon="statusIcon(c.status)" />
              <span class="font-weight-medium">{{ c.name }}</span>
              <span class="text-caption text-medium-emphasis">{{ c.summary }}</span>
            </div>
            <div class="text-caption text-medium-emphasis mt-2">
              {{ strings.pipeline }}:
              <template v-if="digest.alerts?.pipeline_last_seen_at">
                {{ formatTime(digest.alerts.pipeline_last_seen_at) }}
                <v-chip v-if="digest.alerts.pipeline_stale" color="error" size="x-small">{{ strings.pipelineStale }}</v-chip>
              </template>
              <template v-else>{{ strings.pipelineNever }}</template>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card variant="outlined" class="pa-3 h-100">
            <div class="text-subtitle-2 mb-2">{{ strings.traffic }}</div>
            <template v-if="digest.metrics && !digest.metrics.error">
              <div class="d-flex justify-space-between"><span>{{ strings.requests }}</span><span>{{ fmtCount(digest.metrics.requests) }}</span></div>
              <div class="d-flex justify-space-between"><span>{{ strings.errorRate }}</span><span>{{ fmtPct(digest.metrics.error_rate) }}</span></div>
              <div class="d-flex justify-space-between"><span>{{ strings.p95 }}</span><span>{{ fmtSecs(digest.metrics.p95_seconds) }}</span></div>
              <div v-if="digest.metrics.flags.length" class="mt-2">
                <v-chip v-for="f in digest.metrics.flags" :key="f" color="warning" size="x-small" class="mr-1">{{ f }}</v-chip>
              </div>
            </template>
            <div v-else class="text-caption text-medium-emphasis">{{ digest.metrics?.error ?? strings.metricsUnavailable }}</div>
            <div class="text-caption text-medium-emphasis mt-2">
              {{ strings.deploys }}: {{ digest.summary.deploys }} · {{ digest.summary.boots }} {{ strings.restarts }}
            </div>
          </v-card>
        </v-col>

        <v-col v-if="digest.alerts && digest.alerts.firing.length" cols="12" md="6">
          <v-card variant="outlined" class="pa-3 h-100">
            <div class="d-flex align-center mb-2">
              <span class="text-subtitle-2">{{ strings.alertsFiring }}</span>
              <v-spacer />
              <router-link v-if="alertsTo" :to="alertsTo" class="text-caption">{{ strings.viewAll }}</router-link>
            </div>
            <!-- Untrusted text: plain interpolation only (escaped), never v-html. -->
            <div v-for="a in digest.alerts.firing" :key="a.id" class="text-body-2 mb-1 digest-text">
              <strong>{{ a.alertname }}</strong> {{ a.untrusted.annotations.summary ?? "" }}
            </div>
          </v-card>
        </v-col>

        <v-col v-if="newOrRegressed.length" cols="12" md="6">
          <v-card variant="outlined" class="pa-3 h-100">
            <div class="d-flex align-center mb-2">
              <span class="text-subtitle-2">{{ strings.newIssues }} / {{ strings.regressedIssues }}</span>
              <v-spacer />
              <router-link v-if="issuesTo" :to="issuesTo" class="text-caption">{{ strings.viewAll }}</router-link>
            </div>
            <div v-for="i in newOrRegressed" :key="i.id" class="text-body-2 mb-1 digest-text">
              <v-chip :color="i.status === 'regressed' ? 'error' : 'warning'" size="x-small" class="mr-1">{{ i.level }}</v-chip>
              {{ i.untrusted.title }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <template v-if="showGraphs && digest.metrics">
        <div class="text-subtitle-1 mt-6 mb-2">{{ strings.graphs }}</div>
        <div class="d-flex flex-wrap ga-4">
          <OpsGraph
            :title="strings.graphRequests"
            query='sum(rate(http_request_duration_seconds_count{path!="unspecified"}[5m])) * 60'
          />
          <OpsGraph
            :title="strings.graphP95"
            query='histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{path!="unspecified"}[5m])))'
          />
          <OpsGraph
            :title="strings.graphMemory"
            query="100 * node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useOpsDigest } from "../requests/queries.ts";
import OpsGraph from "./OpsGraph.vue";
import { ops_digest_panel as strings } from "./OpsDigestPanel.strings.ts";

withDefaults(defineProps<{ issuesTo?: RouteLocationRaw; alertsTo?: RouteLocationRaw; showGraphs?: boolean }>(), {
  showGraphs: true,
});

const digestQuery = useOpsDigest();
const digest = computed(() => digestQuery.data.value?.digest);

const newOrRegressed = computed(() => [...(digest.value?.issues?.regressed ?? []), ...(digest.value?.issues?.new ?? [])]);

type Pair = { current: number | null; previous: number | null };
const arrow = (p: Pair) =>
  p.current === null || p.previous === null ? "" : p.current > p.previous ? " ↑" : p.current < p.previous ? " ↓" : "";
const fmtCount = (p: Pair) => (p.current === null ? "–" : `${Math.round(p.current).toLocaleString()}${arrow(p)}`);
const fmtPct = (p: Pair) => (p.current === null ? "–" : `${(p.current * 100).toFixed(2)}%${arrow(p)}`);
const fmtSecs = (p: Pair) => (p.current === null ? "–" : `${Math.round(p.current * 1000)} ms${arrow(p)}`);

const statusColor = (s: string) => ({ ok: "success", warn: "warning", fail: "error" })[s] ?? "grey";
const statusIcon = (s: string) =>
  ({ ok: "mdi-check-circle", warn: "mdi-alert", fail: "mdi-close-circle" })[s] ?? "mdi-help-circle";
const formatTime = (ts: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(ts));
</script>

<style scoped>
.digest-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
