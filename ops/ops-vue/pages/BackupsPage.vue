<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-4">{{ strings.page_title }}</AdminPageTitle>
    <v-progress-linear v-if="query.isPending.value" indeterminate />
    <v-alert v-else-if="data && !data.configured" type="warning" variant="tonal" density="compact" data-test="backups-off">
      {{ strings.not_configured }}
    </v-alert>
    <template v-else-if="data">
      <div class="d-flex align-center ga-3 mb-4 flex-wrap">
        <v-btn icon="mdi-chevron-left" size="small" variant="text" :aria-label="'Previous month'" @click="shiftMonth(-1)" />
        <span class="text-subtitle-1 font-weight-medium backups-month">{{ monthLabel }}</span>
        <v-btn icon="mdi-chevron-right" size="small" variant="text" :aria-label="'Next month'" @click="shiftMonth(1)" />
        <v-spacer />
        <span class="text-caption text-medium-emphasis">{{ strings.retention(data.retention_days) }}</span>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-database-arrow-up-outline"
          :loading="run.isPending.value || anyRunning"
          data-test="backups-run"
          @click="run.mutate()"
        >
          {{ strings.back_up_now }}
        </v-btn>
      </div>

      <div class="backups-layout">
        <AdminPanel padded class="backups-calendar" data-test="backups-calendar">
          <div class="backups-grid">
            <div v-for="w in strings.weekdays" :key="w" class="backups-weekday">{{ w }}</div>
            <div v-for="n in leadingBlanks" :key="`b${n}`" />
            <button
              v-for="d in monthDays"
              :key="d.key"
              type="button"
              class="backups-day"
              :class="{ 'backups-day--selected': d.key === selectedDay, 'backups-day--today': d.key === todayKey }"
              :data-test="`backups-day-${d.key}`"
              @click="selectedDay = d.key"
            >
              <span class="backups-day__num">{{ d.date.getUTCDate() }}</span>
              <span class="backups-day__dot" :class="`backups-dot--${d.tone}`" />
              <span v-if="d.extras" class="backups-day__extras" :title="d.extrasTitle">+{{ d.extras }}</span>
            </button>
          </div>
          <div class="backups-legend">
            <span v-for="(label, tone) in strings.legend" :key="tone"><span class="backups-day__dot" :class="`backups-dot--${tone}`" /> {{ label }}</span>
          </div>
        </AdminPanel>

        <AdminPanel class="backups-runs" data-test="backups-runs">
          <div v-if="selectedDay" class="d-flex align-center ga-2 px-4 pt-3 text-body-2 text-medium-emphasis">
            {{ strings.showing_day(selectedLabel) }}
            <v-btn size="x-small" variant="text" @click="selectedDay = null">{{ strings.show_all }}</v-btn>
          </div>
          <p v-if="!shownRuns.length" class="saf-admin-empty pa-4 ma-0">
            {{ selectedDay ? strings.no_backups_day : strings.no_backups }}
          </p>
          <v-table v-else density="compact" hover>
            <thead>
              <tr>
                <th>{{ strings.cols.when }}</th>
                <th>{{ strings.cols.kind }}</th>
                <th>{{ strings.cols.status }}</th>
                <th class="text-end">{{ strings.cols.databases }}</th>
                <th class="text-end">{{ strings.cols.size }}</th>
                <th class="text-end saf-admin-hide-xs">{{ strings.cols.rows }}</th>
                <th class="saf-admin-hide-xs">{{ strings.cols.verified }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in shownRuns" :key="r.key" class="backups-run" data-test="backups-run" @click="openRun = r">
                <td class="text-no-wrap">{{ formatShortDateTime(r.started_at) }}</td>
                <td>{{ strings.tags[r.tag] ?? r.tag }}</td>
                <td class="text-no-wrap">
                  <StatusIcon :tone="toneOf(r.status)" size="16" />
                  <span class="ms-1">{{ strings.statuses[r.status] ?? r.status }}</span>
                </td>
                <td class="text-end">{{ r.backups.length }}</td>
                <td class="text-end text-no-wrap">{{ bytes(r.size_bytes) }}</td>
                <td class="text-end saf-admin-hide-xs">{{ r.rows.toLocaleString() }}</td>
                <td class="saf-admin-hide-xs text-medium-emphasis">
                  {{ r.verified === null ? strings.verified_short.none : r.verified ? strings.verified_short.ok : strings.verified_short.bad }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </AdminPanel>
      </div>
    </template>

    <v-dialog :model-value="!!openRun" max-width="1120" scrollable @update:model-value="(v: boolean) => !v && (openRun = null)">
      <v-card v-if="openRun" data-test="backups-dialog">
        <v-card-title class="text-subtitle-1">
          {{ strings.dialog_title(strings.tags[openRun.tag] ?? openRun.tag, formatShortDateTime(openRun.started_at)) }}
        </v-card-title>
        <v-tabs v-model="openDb" density="compact" show-arrows>
          <v-tab v-for="b in openRun.backups" :key="b.id" :value="b.id" data-test="backups-db-tab">
            <StatusIcon :tone="toneOf(b.status)" size="14" class="me-1" />{{ b.database }}
          </v-tab>
        </v-tabs>
        <v-card-text v-if="openBackup" class="pt-3">
          <ul v-if="openBackup.problems.length || openBackup.error" class="backups-problems">
            <li v-for="p in openBackup.problems" :key="p">{{ p }}</li>
            <li v-if="openBackup.error">{{ openBackup.error }}</li>
          </ul>
          <dl class="backups-facts">
            <dt>{{ strings.size }}</dt>
            <dd>{{ bytes(openBackup.size_bytes) }} <span class="text-medium-emphasis">({{ bytes(openBackup.raw_bytes) }} uncompressed)</span></dd>
            <dt>{{ strings.migration }}</dt>
            <dd class="saf-admin-mono">{{ openBackup.migration ?? "—" }}</dd>
            <dt>{{ strings.hash }}</dt>
            <dd class="saf-admin-mono">{{ openBackup.sha256 ?? "—" }}</dd>
            <dt />
            <dd class="text-medium-emphasis">
              {{ strings.verified(openBackup.verified_ok, openBackup.verified_at ? formatShortDateTime(openBackup.verified_at) : null) }}
            </dd>
          </dl>
          <v-table v-if="tableRows.length" density="compact" class="mt-3" data-test="backups-tables">
            <thead>
              <tr>
                <th>{{ strings.table_cols.table }}</th>
                <th class="text-end">{{ strings.table_cols.rows }}</th>
                <th class="saf-admin-hide-xs">{{ strings.table_cols.created }}</th>
                <th class="saf-admin-hide-xs">{{ strings.table_cols.updated }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tableRows" :key="t.name" data-test="backups-table-row">
                <td class="saf-admin-mono">{{ t.name }}</td>
                <td class="text-end">{{ t.rows.toLocaleString() }}</td>
                <td class="text-caption saf-admin-hide-xs text-no-wrap">{{ t.created }}</td>
                <td class="text-caption saf-admin-hide-xs text-no-wrap">{{ t.updated }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="openRun = null">{{ strings.close }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { AdminPageTitle, AdminPanel, ContentWidth } from "@saflib/vue/components";
import { formatShortDateTime } from "@saflib/vue";
import type { OpsBackupResponse } from "@saflib/ops-spec";
import { useOpsBackups, useRunOpsBackups } from "../requests/queries.ts";
import StatusIcon from "../components/StatusIcon.vue";
import { formatBytes } from "./metric-format.ts";
import { formatStatTime, groupBackupRuns, type BackupRun } from "./backup-runs.ts";
import { ops_backups as strings } from "./Backups.strings.ts";

const query = useOpsBackups();
const run = useRunOpsBackups();
const data = computed(() => query.data.value);
const backups = computed(() => data.value?.backups ?? []);
const anyRunning = computed(() => backups.value.some((b) => b.status === "running"));

const dayKey = (iso: string | Date) => new Date(iso).toISOString().slice(0, 10);
const todayKey = dayKey(new Date());
const month = ref(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)));
const selectedDay = ref<string | null>(null);
const shiftMonth = (n: number) => {
  month.value = new Date(Date.UTC(month.value.getUTCFullYear(), month.value.getUTCMonth() + n, 1));
};
const monthLabel = computed(() => month.value.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }));

const byDay = computed(() => {
  const m = new Map<string, OpsBackupResponse[]>();
  for (const b of backups.value) {
    const k = dayKey(b.started_at);
    m.set(k, [...(m.get(k) ?? []), b]);
  }
  return m;
});

type Tone = "ok" | "suspicious" | "failed" | "none";
const RANK: Record<Tone, number> = { none: 0, ok: 1, suspicious: 2, failed: 3 };
const monthDays = computed(() => {
  const y = month.value.getUTCFullYear();
  const mo = month.value.getUTCMonth();
  const count = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, mo, i + 1));
    const key = dayKey(date);
    const list = (byDay.value.get(key) ?? []).filter((b) => b.status !== "running");
    // The day's dot: the worst of its daily backups (or of all, if none were daily).
    const daily = list.filter((b) => b.tag === "daily");
    let tone: Tone = "none";
    for (const b of daily.length ? daily : list) {
      const t = b.status as Tone;
      if (RANK[t] > RANK[tone]) tone = t;
    }
    const extrasList = list.filter((b) => b.tag !== "daily");
    return {
      key,
      date,
      tone,
      extras: extrasList.length,
      extrasTitle: extrasList.map((b) => `${strings.tags[b.tag] ?? b.tag}: ${b.database}`).join("\n"),
    };
  });
});
// Monday-first grid.
const leadingBlanks = computed(() => (month.value.getUTCDay() + 6) % 7);

const runs = computed(() => groupBackupRuns(backups.value));
const shownRuns = computed(() =>
  selectedDay.value ? runs.value.filter((r) => dayKey(r.started_at) === selectedDay.value) : runs.value,
);
const openRun = ref<BackupRun | null>(null);
const openDb = ref<string | null>(null);
watch(openRun, (r) => {
  openDb.value = r?.backups[0]?.id ?? null;
});
const openBackup = computed(() => openRun.value?.backups.find((b) => b.id === openDb.value) ?? null);
const tableRows = computed(() =>
  Object.entries(openBackup.value?.tables ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, t]) => ({
      name,
      rows: t.rows,
      created: t.created_min != null ? `${formatStatTime(t.created_min)} → ${formatStatTime(t.created_max)}` : "—",
      updated: t.updated_max != null ? `${formatStatTime(t.updated_min)} → ${formatStatTime(t.updated_max)}` : "—",
    })),
);
const selectedLabel = computed(() =>
  selectedDay.value
    ? new Date(`${selectedDay.value}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    : "",
);
watch(month, (m) => {
  if (selectedDay.value && !selectedDay.value.startsWith(dayKey(m).slice(0, 7))) selectedDay.value = null;
});

const toneOf = (s: string): "ok" | "warn" | "bad" => (s === "ok" ? "ok" : s === "failed" ? "bad" : "warn");
const bytes = (n: number | null) => (n === null ? "—" : formatBytes(n));
</script>

<style scoped>
.backups-layout {
  display: grid;
  grid-template-columns: minmax(280px, 380px) 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 760px) {
  .backups-layout {
    grid-template-columns: 1fr;
  }
}
.backups-month {
  min-width: 140px;
  text-align: center;
}
.backups-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.backups-weekday {
  font-size: 0.6875rem;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  padding-bottom: 4px;
}
.backups-day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
  border-radius: 8px;
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  font: inherit;
}
.backups-day:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.backups-day--selected {
  border-color: rgb(var(--v-theme-primary));
}
.backups-day--today .backups-day__num {
  font-weight: 700;
}
.backups-day__num {
  font-size: 0.8125rem;
}
.backups-day__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  vertical-align: middle;
}
.backups-dot--ok {
  background: rgb(var(--v-theme-success));
}
.backups-dot--suspicious {
  background: rgb(var(--v-theme-warning));
}
.backups-dot--failed {
  background: rgb(var(--v-theme-error));
}
.backups-dot--none {
  background: rgba(var(--v-theme-on-surface), 0.12);
}
.backups-day__extras {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 0.625rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.backups-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.backups-run {
  cursor: pointer;
}
.backups-problems {
  margin: 0 0 8px 18px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-warning));
}
.backups-facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px 16px;
  margin: 0;
  font-size: 0.8125rem;
}
.backups-facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.backups-facts dd {
  margin: 0;
}
</style>
