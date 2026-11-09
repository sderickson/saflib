<template>
  <ContentWidth variant="full">
    <h1 class="text-h4 mb-2">{{ strings.title }}</h1>
    <p class="text-body-2 mb-4">{{ strings.intro }}</p>

    <v-tabs v-model="tab" class="mb-4" density="compact">
      <v-tab value="active" data-test="issues-tab-active">{{ strings.tabActive }}</v-tab>
      <v-tab value="resolved">{{ strings.tabResolved }}</v-tab>
      <v-tab value="ignored">{{ strings.tabIgnored }}</v-tab>
    </v-tabs>

    <v-expansion-panels v-if="issues.length > 0" v-model="openId" variant="accordion">
      <v-expansion-panel v-for="issue in issues" :key="issue.id" :value="issue.id" data-test="issue-row">
        <v-expansion-panel-title>
          <div class="d-flex align-center ga-2 w-100 issue-head">
            <v-chip :color="levelColor(issue.level)" size="x-small">{{ issue.level }}</v-chip>
            <v-chip v-if="issue.status === 'regressed'" color="error" variant="outlined" size="x-small">regressed</v-chip>
            <!-- Untrusted text: plain interpolation only (escaped), never v-html. -->
            <span class="issue-title flex-grow-1">{{ issue.untrusted.title }}</span>
            <span class="text-caption text-medium-emphasis text-no-wrap">
              {{ issue.count }} {{ strings.times }} · {{ formatTime(issue.last_seen) }}
            </span>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-table density="compact" class="mb-3">
            <tbody>
              <tr><td class="text-medium-emphasis">{{ strings.firstSeen }}</td><td>{{ formatTime(issue.first_seen) }}</td></tr>
              <tr><td class="text-medium-emphasis">{{ strings.lastSeen }}</td><td>{{ formatTime(issue.last_seen) }}</td></tr>
              <tr>
                <td class="text-medium-emphasis">{{ strings.where }}</td>
                <td>{{ issue.kind }} · {{ issue.service_name ?? "?" }}{{ issue.operation_name ? ` · ${issue.operation_name}` : "" }}</td>
              </tr>
              <tr><td class="text-medium-emphasis">{{ strings.version }}</td><td><code>{{ shortVersion(issue.last_seen_version) }}</code></td></tr>
              <tr>
                <td class="text-medium-emphasis">{{ strings.status }}</td>
                <td>
                  {{ issue.status }}
                  <span v-if="issue.status_changed_by" class="text-caption text-medium-emphasis">
                    ({{ issue.status_changed_by }}{{ issue.status_note ? `: ${issue.status_note}` : "" }})
                  </span>
                </td>
              </tr>
            </tbody>
          </v-table>

          <div class="d-flex flex-wrap ga-2 align-center mb-4">
            <v-text-field
              v-model="note"
              :label="strings.noteLabel"
              density="compact"
              hide-details
              style="min-width: 220px; max-width: 360px"
            />
            <template v-if="issue.status === 'open' || issue.status === 'regressed'">
              <v-btn color="primary" :loading="triage.isPending.value" data-test="issue-resolve" @click="act('resolve', issue.id)">
                {{ strings.resolve }}
              </v-btn>
              <v-btn variant="outlined" :loading="triage.isPending.value" @click="act('ignore', issue.id, 7)">{{ strings.ignoreWeek }}</v-btn>
              <v-btn variant="outlined" :loading="triage.isPending.value" @click="act('ignore', issue.id)">{{ strings.ignoreForever }}</v-btn>
            </template>
            <v-btn v-else variant="outlined" :loading="triage.isPending.value" @click="act('reopen', issue.id)">{{ strings.reopen }}</v-btn>
          </div>

          <h3 class="text-subtitle-1 mb-2">{{ strings.occurrences }}</h3>
          <div v-if="openId === issue.id">
            <p v-if="occurrences.length === 0" class="text-body-2">{{ strings.noOccurrences }}</p>
            <v-card v-for="o in occurrences" :key="o.id" variant="outlined" class="mb-2 pa-2">
              <div class="text-caption text-medium-emphasis mb-1">
                {{ formatTime(o.ts) }}
                <span v-if="o.request_id"> · {{ strings.request }} <code>{{ o.request_id.slice(0, 8) }}</code></span>
                <span v-if="o.version"> · <code>{{ shortVersion(o.version) }}</code></span>
              </div>
              <div class="occurrence-text">{{ o.untrusted.message }}</div>
              <pre v-if="o.untrusted.stack" class="occurrence-text text-caption mt-1">{{ o.untrusted.stack }}</pre>
              <div v-if="o.untrusted.fields" class="occurrence-text text-caption text-medium-emphasis mt-1">
                {{ JSON.stringify(o.untrusted.fields) }}
              </div>
            </v-card>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <p v-else class="text-body-1">{{ strings.empty }}</p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { useIssuesPageLoader } from "./Issues.loader.ts";
import { ops_issues as strings } from "./Issues.strings.ts";
import { useListOpsIssueOccurrences, useTriageOpsIssue, type IssueStatusFilter } from "../requests/queries.ts";

const { statuses, issuesQuery } = useIssuesPageLoader();
const issues = computed(() => issuesQuery.data.value?.issues ?? []);

const TABS: Record<string, IssueStatusFilter[]> = {
  active: ["open", "regressed"],
  resolved: ["resolved"],
  ignored: ["ignored"],
};
const tab = ref("active");
watch(tab, (t) => {
  statuses.value = TABS[t] ?? TABS.active!;
  openId.value = null;
});

const openId = ref<string | null>(null);
const occurrencesQuery = useListOpsIssueOccurrences(openId);
const occurrences = computed(() => occurrencesQuery.data.value?.occurrences ?? []);

const note = ref("");
const triage = useTriageOpsIssue();

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
.issue-title,
.occurrence-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.issue-head {
  min-width: 0;
}
</style>
