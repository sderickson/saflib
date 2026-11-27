<template>
  <ContentWidth variant="full">
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

        <AdminPanel padded class="backups-detail" data-test="backups-detail">
          <p v-if="!selectedDay" class="saf-admin-empty ma-0">{{ strings.pick_day }}</p>
          <template v-else>
            <div class="text-subtitle-2 mb-2">{{ selectedLabel }}</div>
            <p v-if="!dayBackups.length" class="saf-admin-empty ma-0">{{ strings.no_backups_day }}</p>
            <div v-for="b in dayBackups" :key="b.id" class="backups-entry" data-test="backups-entry">
              <div class="d-flex align-center ga-2 flex-wrap">
                <StatusIcon :tone="toneOf(b.status)" />
                <span class="font-weight-medium">{{ b.database }}</span>
                <v-chip size="x-small" variant="tonal">{{ strings.tags[b.tag] ?? b.tag }}</v-chip>
                <span class="text-caption text-medium-emphasis">{{ clock(b.started_at) }}</span>
                <v-spacer />
                <span class="text-caption text-medium-emphasis">{{ strings.statuses[b.status] ?? b.status }}</span>
              </div>
              <ul v-if="b.problems.length || b.error" class="backups-problems">
                <li v-for="p in b.problems" :key="p">{{ p }}</li>
                <li v-if="b.error">{{ b.error }}</li>
              </ul>
              <dl v-if="b.status !== 'failed' && b.status !== 'running'" class="backups-facts">
                <dt>{{ strings.size }}</dt>
                <dd>{{ bytes(b.size_bytes) }} <span class="text-medium-emphasis">({{ bytes(b.raw_bytes) }} uncompressed)</span></dd>
                <dt>{{ strings.tables }}</dt>
                <dd>
                  {{ Object.keys(b.tables).length }} · {{ totalRows(b).toLocaleString() }} {{ strings.rows }}
                  <span v-if="change(b) !== null" class="text-medium-emphasis">({{ change(b) }} {{ strings.change_since }})</span>
                </dd>
                <dt>{{ strings.migration }}</dt>
                <dd class="saf-admin-mono">{{ b.migration ?? "—" }}</dd>
                <dt>{{ strings.hash }}</dt>
                <dd class="saf-admin-mono">{{ b.sha256?.slice(0, 16) }}…</dd>
                <dt />
                <dd class="text-medium-emphasis">{{ strings.verified(b.verified_ok, b.verified_at ? formatShortDateTime(b.verified_at) : null) }}</dd>
              </dl>
              <details v-if="Object.keys(b.tables).length" class="backups-tables">
                <summary class="text-caption">{{ strings.table_list }}</summary>
                <v-table density="compact">
                  <tbody>
                    <tr v-for="(t, name) in b.tables" :key="name">
                      <td class="saf-admin-mono">{{ name }}</td>
                      <td class="text-end">{{ t.rows.toLocaleString() }}</td>
                      <td class="text-caption text-medium-emphasis saf-admin-hide-xs">{{ range(t) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </details>
            </div>
          </template>
        </AdminPanel>
      </div>
    </template>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { AdminPanel, ContentWidth } from "@saflib/vue/components";
import { formatShortDateTime } from "@saflib/vue";
import type { OpsBackupResponse } from "@saflib/ops-spec";
import { useOpsBackups, useRunOpsBackups } from "../requests/queries.ts";
import StatusIcon from "../components/StatusIcon.vue";
import { formatBytes } from "./metric-format.ts";
import { ops_backups as strings } from "./Backups.strings.ts";

const query = useOpsBackups();
const run = useRunOpsBackups();
const data = computed(() => query.data.value);
const backups = computed(() => data.value?.backups ?? []);
const anyRunning = computed(() => backups.value.some((b) => b.status === "running"));

const dayKey = (iso: string | Date) => new Date(iso).toISOString().slice(0, 10);
const todayKey = dayKey(new Date());
const month = ref(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)));
const selectedDay = ref<string | null>(todayKey);
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

const dayBackups = computed(() =>
  selectedDay.value
    ? [...(byDay.value.get(selectedDay.value) ?? [])].sort((a, b) => a.started_at.localeCompare(b.started_at))
    : [],
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
const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const bytes = (n: number | null) => (n === null ? "—" : formatBytes(n));
const totalRows = (b: OpsBackupResponse) => Object.values(b.tables).reduce((s, t) => s + t.rows, 0);

/** Row change versus the previous finished backup of the same database. */
function change(b: OpsBackupResponse): string | null {
  const prev = backups.value.find(
    (o) => o.database === b.database && o.started_at < b.started_at && (o.status === "ok" || o.status === "suspicious"),
  );
  if (!prev) return null;
  const d = totalRows(b) - totalRows(prev);
  return d === 0 ? "no change" : `${d > 0 ? "+" : "−"}${Math.abs(d).toLocaleString()}`;
}

function range(t: OpsBackupResponse["tables"][string]): string {
  const fmt = (v: unknown) => (typeof v === "number" && v > 1e11 ? formatShortDateTime(new Date(v).toISOString()) : String(v));
  const parts: string[] = [];
  if (t.created_min != null) parts.push(`created ${fmt(t.created_min)} → ${fmt(t.created_max)}`);
  if (t.updated_max != null) parts.push(`updated → ${fmt(t.updated_max)}`);
  return parts.join(" · ");
}
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
.backups-entry + .backups-entry {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  margin-top: 12px;
  padding-top: 12px;
}
.backups-problems {
  margin: 6px 0 0 28px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-warning));
}
.backups-facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px 16px;
  margin: 8px 0 0 28px;
  font-size: 0.8125rem;
}
.backups-facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.backups-facts dd {
  margin: 0;
}
.backups-tables {
  margin: 6px 0 0 28px;
}
</style>
