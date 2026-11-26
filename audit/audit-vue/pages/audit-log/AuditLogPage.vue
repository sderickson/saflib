<template>
  <ContentWidth variant="full" class="audit-log-page">
    <AdminPageTitle class="mb-2">{{ strings.title }}</AdminPageTitle>

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
      v-model:expanded="expanded"
      class="audit-log-table"
      :headers="headers"
      :items="tableItems"
      item-value="id"
      :items-per-page="-1"
      hide-default-footer
      density="compact"
      show-expand
      expand-on-click
    >
      <template #[`item.ts`]="{ item }">
        <span class="text-no-wrap">{{ formatShortDateTime(item.ts) }}</span>
      </template>
      <template #[`item.outcome`]="{ item }">
        <!-- Only worth a look when it isn't a success. -->
        <v-chip v-if="item.outcome !== 'success'" size="x-small" color="error" variant="tonal">{{ item.outcome }}</v-chip>
      </template>
      <template #expanded-row="{ columns, item }">
        <tr class="audit-expanded" data-test="audit-expanded">
          <td :colspan="columns.length">
            <dl class="audit-facts">
              <dt>{{ strings.columns.time }}</dt>
              <dd>{{ formatTime(item.ts) }}</dd>
              <dt>{{ strings.columns.source }}</dt>
              <dd>{{ item.source }}</dd>
              <dt>{{ strings.columns.outcome }}</dt>
              <dd>{{ item.outcome }}</dd>
              <dt>{{ strings.columns.request }}</dt>
              <dd>
                <ShortId v-if="item.request_id" :id="item.request_id" prefix="r" />
                <span v-else class="text-medium-emphasis">—</span>
              </dd>
            </dl>
            <pre v-if="item.detailsPretty" class="audit-details-full">{{ item.detailsPretty }}</pre>
          </td>
        </tr>
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
import { AdminPageTitle, ContentWidth, ShortId } from "@saflib/vue/components";
import AuditActor from "./AuditActor.vue";
import { UserRef } from "@saflib/ory-kratos-vue";
import { useRoute, useRouter } from "vue-router";
import { getTanstackErrorMessage, TanstackError } from "@saflib/sdk";
import { formatShortDateTime, showError, showInfo } from "@saflib/vue";
import { computed, ref } from "vue";
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

// Source, request and the full details are in each row's expanded view.
const wide = { headerProps: { class: "saf-admin-hide-xs" }, cellProps: { class: "saf-admin-hide-xs" } };
const headers = [
  { title: strings.columns.time, key: "ts", sortable: false },
  { title: strings.columns.event, key: "event_type", sortable: false },
  { title: strings.columns.actor, key: "actor_user_id", sortable: false },
  { title: strings.columns.resource, key: "resource", sortable: false, ...wide },
  { title: strings.columns.outcome, key: "outcome", sortable: false, ...wide },
  { title: "", key: "data-table-expand", sortable: false, align: "end" as const },
];
const expanded = ref<string[]>([]);

const tableItems = computed(() =>
  rows.value.map((r) => ({
    ...r,
    resource: [r.resource_type, r.resource_id].filter(Boolean).join(" "),
    detailsPretty: formatDetails(r.details),
  })),
);

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(iso));
}

function formatDetails(details: AuditLog["details"]): string | null {
  if (details == null) return null;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return null;
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
.audit-expanded > td {
  background: #fcfaf3;
  padding: 12px 16px !important;
}
.audit-facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 0 0 8px;
  font-size: 0.8125rem;
}
.audit-facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.audit-facts dd {
  margin: 0;
}
.audit-details-full {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.75rem;
  background: #fff;
  border: 1px solid #eaeaea;
  border-radius: 6px;
  padding: 10px 12px;
  margin: 0;
  max-height: 320px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
