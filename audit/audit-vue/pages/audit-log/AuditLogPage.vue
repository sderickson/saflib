<template>
  <ContentWidth variant="full" class="audit-log-page">
    <h1 class="text-h4 mb-2">{{ strings.title }}</h1>

    <p v-if="spanHead || spanTail" class="text-body-2 text-medium-emphasis mb-4">
      {{ strings.stored_span }}
      <span class="saf-admin-mono">{{ spanHead ?? "—" }} → {{ spanTail ?? "—" }}</span>
    </p>
    <p v-else-if="spanChecked && !spanHead && !spanTail" class="saf-admin-empty mb-4">
      {{ strings.no_events }}
    </p>

    <div class="d-flex flex-wrap ga-3 align-end mb-4">
      <v-text-field
        v-model="fromInput"
        :label="strings.from_label"
        :hint="strings.from_hint"
        density="comfortable"
        hide-details="auto"
        class="flex-grow-1"
        style="max-width: 28rem"
        autocomplete="off"
      />
      <v-btn
        color="primary"
        variant="flat"
        :loading="listLoading"
        :disabled="listLoading || sealPending"
        @click="reloadFromStart"
      >
        {{ strings.apply }}
      </v-btn>
      <v-btn
        v-if="sealEnabled"
        variant="outlined"
        :loading="sealPending"
        :disabled="listLoading || sealPending || loadMorePending"
        @click="onSeal"
      >
        {{ strings.seal }}
      </v-btn>
    </div>

    <div v-if="userFilter" class="d-flex align-center ga-2 mb-3" data-test="audit-user-filter">
      <span class="text-body-2 text-medium-emphasis">{{ strings.filtered_to }}</span>
      <v-chip closable variant="outlined" :close-label="strings.clear_user" @click:close="clearUserFilter">
        <UserRef :id="userFilter" />
      </v-chip>
    </div>

    <p v-if="rows.length > 0" class="text-body-2 text-medium-emphasis mb-2">
      {{ strings.loaded }} {{ rows.length }}
    </p>

    <v-data-table
      class="audit-log-table"
      :headers="headers"
      :items="tableItems"
      :items-per-page="-1"
      hide-default-footer
      density="compact"
    >
      <template #[`item.ts`]="{ item }">
        <span class="text-no-wrap">{{ formatTime(item.ts) }}</span>
      </template>
      <template #[`item.actor_user_id`]="{ item }">
        <AuditActor :row="item" />
      </template>
      <template #[`item.resource`]="{ item }">
        <span v-if="item.resource_type || item.resource_id" class="d-inline-flex align-center ga-1 text-no-wrap">
          <span v-if="item.resource_type">{{ item.resource_type }}</span>
          <ShortId v-if="item.resource_id" :id="item.resource_id" :prefix="item.resource_type?.charAt(0)" />
        </span>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template #[`item.details`]="{ item }">
        <span class="audit-details" :title="item.details">{{ item.details }}</span>
      </template>
      <template #[`item.request_id`]="{ item }">
        <ShortId v-if="item.request_id" :id="item.request_id" prefix="r" />
        <span v-else class="text-medium-emphasis">—</span>
      </template>
    </v-data-table>

    <div class="mt-4">
      <v-btn
        color="primary"
        variant="outlined"
        :disabled="!nextCursor || listLoading || sealPending || loadMorePending"
        :loading="loadMorePending"
        @click="loadMore"
      >
        {{ strings.load_more }}
      </v-btn>
    </div>
  </ContentWidth>
</template>

<script setup lang="ts">
import type { AuditLog } from "@saflib/audit-spec/types";
import { ContentWidth, ShortId } from "@saflib/vue/components";
import AuditActor from "./AuditActor.vue";
import { UserRef } from "@saflib/ory-kratos-vue";
import { useRoute, useRouter } from "vue-router";
import { getTanstackErrorMessage, TanstackError } from "@saflib/sdk";
import { showError, showInfo } from "@saflib/vue";
import { computed } from "vue";
import { audit_log as strings } from "./AuditLog.strings.ts";
import { useAuditLogsPageLoader } from "./AuditLog.loader.ts";

withDefaults(
  defineProps<{
    sealEnabled?: boolean;
  }>(),
  {
    sealEnabled: false,
  },
);

const {
  fromInput,
  userFilter,
  rows,
  nextCursor,
  spanHead,
  spanTail,
  spanChecked,
  auditLogsQuery,
  loadMorePending,
  reloadFromStart,
  loadMore,
  sealMutation,
} = useAuditLogsPageLoader();

const route = useRoute();
const router = useRouter();
function clearUserFilter() {
  router.replace({ query: { ...route.query, user: undefined } });
}

const listLoading = computed(
  () =>
    auditLogsQuery.isLoading.value || auditLogsQuery.isFetching.value,
);
const sealPending = computed(() => sealMutation.isPending.value);

const headers = [
  { title: strings.columns.time, key: "ts", sortable: false },
  { title: strings.columns.source, key: "source", sortable: false },
  { title: strings.columns.event, key: "event_type", sortable: false },
  { title: strings.columns.outcome, key: "outcome", sortable: false },
  { title: strings.columns.actor, key: "actor_user_id", sortable: false },
  { title: strings.columns.resource, key: "resource", sortable: false },
  { title: strings.columns.request, key: "request_id", sortable: false },
  { title: strings.columns.details, key: "details", sortable: false },
];

const tableItems = computed(() =>
  rows.value.map((r) => ({
    ...r,
    resource: [r.resource_type, r.resource_id].filter(Boolean).join(" "),
    details: formatDetails(r.details),
  })),
);

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(iso));
}

function formatDetails(details: AuditLog["details"]): string {
  if (details == null) return "—";
  try {
    // Full JSON; the cell truncates to one line and shows it all on hover.
    return JSON.stringify(details);
  } catch {
    return "—";
  }
}

async function onSeal() {
  try {
    const result = await sealMutation.mutateAsync();
    const ar = result.audit_seal_result;
    if (ar.status === "sealed") {
      showInfo("Audit log sealed and shipped.");
    } else if (ar.reason === "empty") {
      showInfo("Nothing to seal — the active audit database is empty.");
    } else {
      showInfo("Seal skipped — another seal is in progress.");
    }
    reloadFromStart();
  } catch (e: unknown) {
    const message =
      e instanceof TanstackError
        ? getTanstackErrorMessage(e)
        : e instanceof Error
          ? e.message
          : String(e ?? "Unknown error");
    showError(message);
  }
}
</script>

<style scoped>
.audit-log-table :deep(th) {
  white-space: nowrap;
}
/* One line per event, so rows line up; the full details are on hover. */
.audit-details {
  display: block;
  max-width: 32rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
