<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-2">{{ strings.title }}</AdminPageTitle>

    <AdminSubTabs>
    <v-tabs :model-value="tab" class="mb-4" density="compact" @update:model-value="goToTab">
      <v-tab value="firing" data-test="alerts-tab-firing">{{ strings.tabFiring }}</v-tab>
      <v-tab value="recent" data-test="alerts-tab-recent">{{ strings.tabRecent }}</v-tab>
    </v-tabs>
    </AdminSubTabs>

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
          <td class="text-caption text-no-wrap saf-admin-hide-xs">
            {{ strings.started }} {{ formatTime(a.starts_at) }}
            <div v-if="a.ends_at">{{ strings.ended }} {{ formatTime(a.ends_at) }}</div>
          </td>
          <td class="text-no-wrap">
            <div v-if="a.resolved_by" class="text-caption text-medium-emphasis" data-test="alert-resolved-by">
              {{ strings.resolvedBy }} {{ a.resolved_by }}
            </div>
            <div v-if="a.acked_at" class="text-caption text-medium-emphasis">
              {{ strings.acked }} ({{ a.acked_by }})
            </div>
            <!-- Fixed slots: acknowledge, resolve. -->
            <div v-if="a.status === 'firing'" class="saf-admin-actions">
              <v-btn
                icon="mdi-bell-check-outline"
                size="small"
                variant="text"
                color="primary"
                :title="strings.ack"
                :aria-label="strings.ack"
                :class="{ 'saf-admin-action--off': !!a.acked_at }"
                :disabled="!!a.acked_at"
                :loading="ack.isPending.value"
                data-test="alert-ack"
                @click="ack.mutate({ id: a.id })"
              />
              <v-btn
                icon="mdi-check-circle-outline"
                size="small"
                variant="text"
                :title="strings.resolve"
                :aria-label="strings.resolve"
                :loading="resolve.isPending.value"
                data-test="alert-resolve"
                @click="resolveAlert(a.id)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>
    <p v-else class="saf-admin-empty">{{ strings.empty }}</p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AdminPageTitle, ContentWidth, AdminSubTabs } from "@saflib/vue/components";
import { useAlertsPageLoader } from "./Alerts.loader.ts";
import { ops_alerts as strings } from "./Alerts.strings.ts";
import { useAckOpsAlert, useResolveOpsAlert } from "../requests/queries.ts";

const { tab, alertsQuery } = useAlertsPageLoader();
const alerts = computed(() => alertsQuery.data.value?.alerts ?? []);
const ack = useAckOpsAlert();
const resolve = useResolveOpsAlert();

function resolveAlert(id: string) {
  if (!window.confirm(strings.resolveConfirm)) return;
  resolve.mutate({ id });
}

const route = useRoute();
const router = useRouter();
function goToTab(t: unknown) {
  const { view: _view, ...rest } = route.query;
  void router.push({ query: t === "recent" ? { ...rest, view: "recent" } : rest });
}

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
