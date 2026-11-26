<template>
  <v-tooltip v-if="label" location="bottom" :text="tooltip">
    <template #activator="{ props: tooltipProps }">
      <v-chip v-bind="tooltipProps" size="small" variant="tonal" data-test="traffic-chip">{{ label }}</v-chip>
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useOpsDigest } from "../requests/queries.ts";
import { compactNumber } from "./compact-number.ts";

const query = useOpsDigest();
const digest = computed(() => query.data.value?.digest);

/** Requests per minute over the last hour from Prometheus; else since start. */
const perMinute = computed(() => {
  const series = digest.value?.activity?.requests_by_hour;
  const last = series?.[series.length - 1];
  return last ? Math.round(last.requests / 60) : null;
});

const label = computed(() => {
  const d = digest.value;
  if (!d) return "";
  if (d.metrics && !d.metrics.error && perMinute.value !== null) return `${compactNumber(perMinute.value)} req/min`;
  return `${compactNumber(d.process.requests_total)} requests since start`;
});

const tooltip = computed(() =>
  digest.value?.metrics && !digest.value.metrics.error
    ? "User-facing requests per minute, last hour (Prometheus)"
    : `${digest.value?.process.requests_total.toLocaleString() ?? 0} requests since this process started (Prometheus isn't configured here)`,
);
</script>
