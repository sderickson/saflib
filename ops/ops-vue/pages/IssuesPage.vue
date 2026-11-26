<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-2">{{ strings.title }}</AdminPageTitle>

    <v-tabs :model-value="tab" class="mb-4" density="compact" @update:model-value="goToTab">
      <v-tab value="active" data-test="issues-tab-active">{{ strings.tabActive }}</v-tab>
      <v-tab value="resolved" data-test="issues-tab-resolved">{{ strings.tabResolved }}</v-tab>
      <v-tab value="ignored" data-test="issues-tab-ignored">{{ strings.tabIgnored }}</v-tab>
    </v-tabs>

    <div v-if="selected.length" class="d-flex flex-wrap align-center ga-2 mb-2" data-test="issues-bulk">
      <span class="text-body-2">{{ strings.selected(selected.length) }}</span>
      <template v-if="tab === 'active'">
        <v-btn size="small" color="primary" variant="flat" prepend-icon="mdi-check" :loading="bulkPending" data-test="issues-bulk-resolve" @click="bulk('resolve')">
          {{ strings.resolve }}
        </v-btn>
        <v-btn size="small" variant="outlined" :loading="bulkPending" @click="bulk('ignore', 7)">{{ strings.ignoreWeek }}</v-btn>
        <v-btn size="small" variant="outlined" :loading="bulkPending" @click="bulk('ignore')">{{ strings.ignoreForever }}</v-btn>
      </template>
      <v-btn v-else size="small" variant="outlined" prepend-icon="mdi-restore" :loading="bulkPending" data-test="issues-bulk-reopen" @click="bulk('reopen')">
        {{ strings.reopen }}
      </v-btn>
      <v-btn size="small" variant="text" @click="selected = []">{{ strings.clear }}</v-btn>
    </div>

    <v-table v-if="issues.length > 0" class="issues-table">
      <thead>
        <tr>
          <th class="issues-table__check">
            <v-checkbox-btn
              :model-value="allSelected"
              :indeterminate="selected.length > 0 && !allSelected"
              :aria-label="strings.selectAll"
              density="compact"
              @update:model-value="toggleAll"
            />
          </th>
          <th>{{ strings.cols.issue }}</th>
          <th class="text-right saf-admin-hide-xs">{{ strings.cols.events }}</th>
          <th class="saf-admin-hide-xs">{{ strings.cols.lastSeen }}</th>
          <th aria-hidden="true" />
        </tr>
      </thead>
      <tbody>
        <template v-for="issue in issues" :key="issue.id">
          <tr class="issues-row" :class="{ 'issues-row--open': openId === issue.id }" data-test="issue-row">
            <td class="issues-table__check">
              <v-checkbox-btn v-model="selected" :value="issue.id" :aria-label="strings.select" density="compact" />
            </td>
            <td>
              <button type="button" class="issues-row__title" :aria-expanded="openId === issue.id" @click="toggle(issue.id)">
                <v-chip :color="levelColor(issue.level)" size="x-small" variant="tonal">{{ issue.level }}</v-chip>
                <v-chip v-if="issue.status === 'regressed'" color="error" variant="outlined" size="x-small">regressed</v-chip>
                <!-- Untrusted text: plain interpolation only (escaped), never v-html. -->
                <span class="issue-title">{{ issue.untrusted.title }}</span>
              </button>
              <div class="text-caption text-medium-emphasis saf-admin-only-xs">
                {{ issue.count.toLocaleString() }} {{ strings.times }} · {{ formatTime(issue.last_seen) }}
              </div>
            </td>
            <td class="text-right text-no-wrap saf-admin-hide-xs">{{ issue.count.toLocaleString() }}</td>
            <td class="text-no-wrap text-medium-emphasis saf-admin-hide-xs">{{ formatTime(issue.last_seen) }}</td>
            <td class="issues-table__chevron">
              <v-icon :icon="openId === issue.id ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="18" />
            </td>
          </tr>
          <tr v-if="openId === issue.id" class="issues-detail-row">
            <td colspan="5">
              <div class="issue-detail">
                <section class="issue-detail__facts">
                  <dl class="issue-facts">
                    <dt>{{ strings.firstSeen }}</dt>
                    <dd>{{ formatTime(issue.first_seen) }}</dd>
                    <dt>{{ strings.lastSeen }}</dt>
                    <dd>{{ formatTime(issue.last_seen) }}</dd>
                    <dt>{{ strings.where }}</dt>
                    <dd>{{ issue.kind }} · {{ issue.service_name ?? "?" }}{{ issue.operation_name ? ` · ${issue.operation_name}` : "" }}</dd>
                    <dt>{{ strings.version }}</dt>
                    <dd><code>{{ shortVersion(issue.last_seen_version) }}</code></dd>
                    <dt>{{ strings.status }}</dt>
                    <dd>
                      {{ issue.status }}
                      <span v-if="issue.status_changed_by" class="text-medium-emphasis">
                        ({{ issue.status_changed_by }}{{ issue.status_note ? `: ${issue.status_note}` : "" }})
                      </span>
                    </dd>
                  </dl>
                  <v-text-field v-model="note" :placeholder="strings.noteLabel" class="mt-3 mb-2" />
                  <div class="d-flex flex-wrap ga-2">
                    <template v-if="issue.status === 'open' || issue.status === 'regressed'">
                      <v-btn color="primary" variant="flat" :loading="triage.isPending.value" data-test="issue-resolve" @click="act('resolve', issue.id)">
                        {{ strings.resolve }}
                      </v-btn>
                      <v-btn variant="outlined" :loading="triage.isPending.value" @click="act('ignore', issue.id, 7)">{{ strings.ignoreWeek }}</v-btn>
                      <v-btn variant="outlined" :loading="triage.isPending.value" @click="act('ignore', issue.id)">{{ strings.ignoreForever }}</v-btn>
                    </template>
                    <v-btn v-else variant="outlined" :loading="triage.isPending.value" data-test="issue-reopen" @click="act('reopen', issue.id)">{{ strings.reopen }}</v-btn>
                  </div>
                </section>

                <section class="issue-detail__occurrence" data-test="issue-occurrence">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-body-2 font-weight-medium">
                      <template v-if="occurrences.length">{{ strings.occurrenceOf(occIndex + 1, occurrences.length) }}</template>
                      <template v-else>{{ strings.occurrences }}</template>
                    </span>
                    <div v-if="occurrences.length > 1">
                      <v-btn icon="mdi-chevron-left" size="small" variant="text" :disabled="occIndex === 0" :aria-label="strings.newer" data-test="occurrence-newer" @click="occIndex--" />
                      <v-btn icon="mdi-chevron-right" size="small" variant="text" :disabled="occIndex >= occurrences.length - 1" :aria-label="strings.older" data-test="occurrence-older" @click="occIndex++" />
                    </div>
                  </div>
                  <v-progress-linear v-if="occurrencesQuery.isPending.value" indeterminate />
                  <p v-else-if="!occurrence" class="text-body-2 text-medium-emphasis">{{ strings.noOccurrences }}</p>
                  <template v-else>
                    <div class="text-caption text-medium-emphasis mb-2">
                      {{ formatTime(occurrence.ts) }}
                      <span v-if="occurrence.request_id"> · {{ strings.request }} <ShortId :id="occurrence.request_id" prefix="r" /></span>
                      <span v-if="occurrence.version"> · <code>{{ shortVersion(occurrence.version) }}</code></span>
                    </div>
                    <div class="occurrence-text mb-2">{{ occurrence.untrusted.message }}</div>
                    <pre v-if="occurrence.untrusted.stack" class="occurrence-code">{{ occurrence.untrusted.stack }}</pre>
                    <pre v-if="occurrence.untrusted.fields" class="occurrence-code">{{ JSON.stringify(occurrence.untrusted.fields, null, 2) }}</pre>
                  </template>
                </section>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </v-table>
    <p v-else class="saf-admin-empty">{{ strings.empty }}</p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AdminPageTitle, ContentWidth, ShortId } from "@saflib/vue/components";
import { useIssuesPageLoader, type IssueTab } from "./Issues.loader.ts";
import { ops_issues as strings } from "./Issues.strings.ts";
import { useListOpsIssueOccurrences, useTriageOpsIssue } from "../requests/queries.ts";

const { tab, issuesQuery } = useIssuesPageLoader();
const issues = computed(() => issuesQuery.data.value?.issues ?? []);

const route = useRoute();
const router = useRouter();
function goToTab(t: unknown) {
  const { status: _status, ...rest } = route.query;
  void router.push({ query: t === "active" ? rest : { ...rest, status: t as IssueTab } });
}
watch(tab, () => {
  openId.value = null;
  selected.value = [];
});

const openId = ref<string | null>(null);
const note = ref("");
const triage = useTriageOpsIssue();
const occurrencesQuery = useListOpsIssueOccurrences(openId);
const occurrences = computed(() => occurrencesQuery.data.value?.occurrences ?? []);
// Newest first; the arrows step through them.
const occIndex = ref(0);
const occurrence = computed(() => occurrences.value[occIndex.value] ?? null);
watch(openId, () => {
  occIndex.value = 0;
  note.value = "";
});
function toggle(id: string) {
  openId.value = openId.value === id ? null : id;
}

const selected = ref<string[]>([]);
const allSelected = computed(() => issues.value.length > 0 && selected.value.length === issues.value.length);
function toggleAll(on: unknown) {
  selected.value = on ? issues.value.map((i) => i.id) : [];
}
const bulkPending = ref(false);
async function bulk(action: "resolve" | "ignore" | "reopen", days?: number) {
  bulkPending.value = true;
  try {
    const until = action === "ignore" && days ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined;
    for (const id of selected.value) {
      await triage.mutateAsync(action === "ignore" ? { action, id, until } : { action, id });
    }
    selected.value = [];
    openId.value = null;
  } finally {
    bulkPending.value = false;
  }
}


async function act(action: "resolve" | "ignore" | "reopen", id: string, days?: number) {
  const n = note.value.trim() || undefined;
  if (action === "ignore") {
    const until = days ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined;
    await triage.mutateAsync({ action, id, note: n, until });
  } else {
    await triage.mutateAsync({ action, id, note: n });
  }
  note.value = "";
  openId.value = null;
}

const formatTime = (ts: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(ts));
const shortVersion = (v: string | null) => (v ? v.slice(0, 12) : "unknown");
const levelColor = (level: string) => ({ fatal: "error", error: "error", warn: "warning" })[level] ?? "grey";
</script>

<style scoped>
.issues-table__check {
  width: 44px;
  padding-right: 0 !important;
}
.issues-table__chevron {
  width: 36px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.issues-row {
  cursor: pointer;
}
.issues-row--open > td {
  border-bottom: 0 !important;
}
.issues-row__title {
  appearance: none;
  background: transparent;
  border: 0;
  box-shadow: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  padding: 6px 0;
  min-width: 0;
}
.issue-title,
.occurrence-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.issues-detail-row > td {
  background: #fcfaf3;
  padding: 16px !important;
}
.issue-detail {
  display: grid;
  grid-template-columns: minmax(260px, 2fr) minmax(0, 3fr);
  gap: 24px;
}
@media (max-width: 1100px) {
  .issue-detail {
    grid-template-columns: 1fr;
  }
}
.issue-facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 0.875rem;
}
.issue-facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.issue-facts dd {
  margin: 0;
  min-width: 0;
}
.issue-detail__occurrence {
  min-width: 0;
  background: #fff;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  padding: 12px 14px;
}
.occurrence-code {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.75rem;
  background: #f7f5ee;
  border-radius: 6px;
  padding: 10px 12px;
  margin: 0 0 8px;
  max-height: 340px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
