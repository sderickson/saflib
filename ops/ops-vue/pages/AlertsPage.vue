<template>
  <ContentWidth variant="full">
    <h1 class="text-h4 mb-2">{{ strings.title }}</h1>
    <p class="text-body-2 mb-4">{{ strings.intro }}</p>

    <v-tabs v-model="tab" class="mb-4" density="compact">
      <v-tab value="firing">{{ strings.tabFiring }}</v-tab>
      <v-tab value="recent" data-test="alerts-tab-recent">{{ strings.tabRecent }}</v-tab>
    </v-tabs>

    <v-table v-if="alerts.length > 0" density="compact" class="elevation-1">
      <tbody>
        <tr v-for="a in alerts" :key="a.id" data-test="alert-row">
          <td>
            <v-chip :color="a.status === 'resolved' ? 'success' : severityColor(a.severity)" size="x-small">
              {{ a.status === "resolved" ? strings.resolved : (a.severity ?? "firing") }}
            </v-chip>
          </td>
          <td>
            <div class="font-weight-medium">{{ a.alertname }}</div>
            <!-- Untrusted text: plain interpolation only (escaped), never v-html. -->
            <div class="text-body-2 alert-text">{{ a.untrusted.annotations.summary ?? "" }}</div>
            <div class="text-caption text-medium-emphasis">{{ labelText(a.labels) }}</div>
          </td>
          <td class="text-caption text-no-wrap">
            {{ strings.started }} {{ formatTime(a.starts_at) }}
            <div v-if="a.ends_at">{{ strings.ended }} {{ formatTime(a.ends_at) }}</div>
          </td>
          <td class="text-no-wrap">
            <span v-if="a.acked_at" class="text-caption text-medium-emphasis">
              {{ strings.acked }} ({{ a.acked_by }})
            </span>
            <v-btn
              v-else-if="a.status === 'firing'"
              size="small"
              variant="outlined"
              :loading="ack.isPending.value"
              data-test="alert-ack"
              @click="ack.mutate({ id: a.id })"
            >
              {{ strings.ack }}
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
    <p v-else class="text-body-1">{{ strings.empty }}</p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { useAlertsPageLoader } from "./Alerts.loader.ts";
import { ops_alerts as strings } from "./Alerts.strings.ts";
import { useAckOpsAlert } from "../requests/queries.ts";

const { view, alertsQuery } = useAlertsPageLoader();
const alerts = computed(() => alertsQuery.data.value?.alerts ?? []);
const ack = useAckOpsAlert();

const tab = ref("firing");
watch(tab, (t) => {
  view.value =
    t === "recent" ? { all: true, since: new Date(Date.now() - 7 * 86_400_000).toISOString() } : { all: false };
});

/** Labels that say where, minus the ones already shown. */
const labelText = (labels: Record<string, string>) =>
  Object.entries(labels)
    .filter(([k]) => !["alertname", "severity"].includes(k))
    .map(([k, v]) => `${k}=${v}`)
    .join(" · ");

const formatTime = (ts: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(ts));
const severityColor = (s: string | null) => ({ critical: "error", warning: "warning" })[s ?? ""] ?? "grey";
</script>

<style scoped>
.alert-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
