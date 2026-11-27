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
                <th>{{ strings.cols.verified }}</th>
                <th class="text-end">{{ strings.cols.databases }}</th>
                <th class="text-end">{{ strings.cols.size }}</th>
                <th class="text-end saf-admin-hide-xs">{{ strings.cols.rows }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in shownRuns" :key="r.key" class="backups-run" data-test="backups-run" @click="openRun = r">
                <td class="text-no-wrap">{{ formatShortDateTime(r.started_at) }}</td>
                <td>{{ strings.tags[r.tag] ?? r.tag }}</td>
                <td class="text-no-wrap" :title="strings.run_state_hints[runState(r)]">
                  <StatusIcon :tone="stateTone(runState(r))" size="16" />
                  <span class="ms-1">{{ strings.run_states[runState(r)] }}</span>
                </td>
                <td class="text-end">{{ r.backups.length }}</td>
                <td class="text-end text-no-wrap">{{ bytes(r.size_bytes) }}</td>
                <td class="text-end saf-admin-hide-xs">{{ r.rows.toLocaleString() }}</td>
              </tr>
            </tbody>
          </v-table>
        </AdminPanel>
      </div>
    </template>

    <v-dialog :model-value="!!openRun" max-width="960" scrollable @update:model-value="(v: boolean) => !v && (openRun = null)">
      <v-card v-if="openRun" height="min(85vh, 900px)" data-test="backups-dialog">
        <v-card-title class="text-subtitle-1">
          {{ strings.dialog_title(strings.tags[openRun.tag] ?? openRun.tag, formatShortDateTime(openRun.started_at)) }}
        </v-card-title>
        <v-tabs v-model="openDb" density="compact" show-arrows class="flex-0-0">
          <v-tab v-for="b in openRun.backups" :key="b.id" :value="b.id" data-test="backups-db-tab">
            <StatusIcon :tone="toneOf(b.status)" size="14" class="me-1" />{{ b.database }}
          </v-tab>
        </v-tabs>
        <v-divider />
        <v-card-text v-if="openBackup" class="pt-4">
          <ul v-if="openBackup.problems.length || openBackup.error" class="backups-problems">
            <li v-for="p in openBackup.problems" :key="p">{{ p }}</li>
            <li v-if="openBackup.error">{{ openBackup.error }}</li>
          </ul>
          <dl class="backups-facts" data-test="backups-facts">
            <dt>{{ strings.size }}</dt>
            <dd>{{ bytes(openBackup.size_bytes) }} <span class="text-medium-emphasis">({{ bytes(openBackup.raw_bytes) }} uncompressed)</span></dd>
            <dt>{{ strings.migration }}</dt>
            <dd class="saf-admin-mono">{{ openBackup.migration ?? "—" }}</dd>
            <dt>{{ strings.hash }}</dt>
            <dd>
              <button
                v-if="openBackup.sha256"
                type="button"
                class="backups-hash saf-admin-mono"
                :title="openBackup.sha256"
                data-test="backups-hash"
                @click="copyHash(openBackup.sha256)"
              >
                {{ openBackup.sha256.slice(0, 12) }}…
                <v-icon :icon="copied === openBackup.sha256 ? 'mdi-check' : 'mdi-content-copy'" size="14" class="ms-1" />
                <span v-if="copied === openBackup.sha256" class="text-caption text-medium-emphasis ms-1">{{ strings.copied }}</span>
              </button>
              <span v-else>—</span>
            </dd>
            <dt />
            <dd class="text-medium-emphasis">
              {{ strings.verified(openBackup.verified_ok, openBackup.verified_at ? formatShortDateTime(openBackup.verified_at) : null) }}
            </dd>
          </dl>
          <v-table v-if="tableRows.length" density="compact" class="mt-4" data-test="backups-tables">
            <thead>
              <tr>
                <th>{{ strings.table_cols.table }}</th>
                <th class="text-end">{{ strings.table_cols.rows }}</th>
                <th class="saf-admin-hide-xs">{{ strings.table_cols.range }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tableRows" :key="t.name" data-test="backups-table-row">
                <td class="saf-admin-mono">{{ t.name }}</td>
                <td class="text-end">{{ t.rows.toLocaleString() }}</td>
                <td class="saf-admin-hide-xs text-no-wrap">
                  <template v-if="t.range">
                    {{ t.range.from }}
                    <v-icon icon="mdi-arrow-right" size="14" class="mx-1 text-medium-emphasis" />
                    {{ t.range.to }}
                  </template>
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
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
import { formatShortDate, formatShortDateTime } from "@saflib/vue";
import type { OpsBackupResponse } from "@saflib/ops-spec";
import { useOpsBackups, useRunOpsBackups } from "../requests/queries.ts";
import StatusIcon from "../components/StatusIcon.vue";
import { formatBytes } from "./metric-format.ts";
import { groupBackupRuns, tableDateRange, type BackupRun } from "./backup-runs.ts";
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
    return { key, date, tone };
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
      range: tableDateRange(t, formatShortDate),
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
/** One state per run: failures and mismatches first, then "looks wrong", then verified vs only checked. */
function runState(r: BackupRun): string {
  if (r.status === "running") return "running";
  if (r.status === "failed") return "failed";
  if (r.verified === false) return "mismatch";
  if (r.status === "suspicious") return "suspicious";
  return r.verified ? "verified" : "checked";
}
const stateTone = (state: string): "ok" | "warn" | "bad" =>
  state === "verified" || state === "checked" ? "ok" : state === "failed" || state === "mismatch" ? "bad" : "warn";
const copied = ref<string | null>(null);
async function copyHash(hash: string) {
  await navigator.clipboard.writeText(hash);
  copied.value = hash;
  setTimeout(() => {
    if (copied.value === hash) copied.value = null;
  }, 1500);
}
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
  gap: 4px 24px;
  margin: 8px 0 0;
  padding: 12px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  font-size: 0.8125rem;
}
.backups-hash {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
}
.backups-hash:hover {
  text-decoration: underline;
}
.backups-facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.backups-facts dd {
  margin: 0;
}
</style>
