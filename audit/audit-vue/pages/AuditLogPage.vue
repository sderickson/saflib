<template>
  <v-container fluid class="audit-log-page">
    <v-row>
      <v-col>
        <h1 class="text-h4 mb-2">Audit log</h1>
        <p v-if="description" class="text-body-1 text-medium-emphasis mb-4">
          {{ description }}
        </p>

        <v-alert
          v-if="spanHead || spanTail"
          type="info"
          variant="tonal"
          class="mb-4"
          density="comfortable"
        >
          <strong>Stored span:</strong>
          {{ spanHead ?? "—" }} → {{ spanTail ?? "—" }}
        </v-alert>
        <v-alert
          v-else-if="spanChecked && !spanHead && !spanTail"
          type="info"
          variant="tonal"
          class="mb-4"
          density="comfortable"
        >
          No events in the audit database.
        </v-alert>

        <div class="d-flex flex-wrap ga-3 align-end mb-4">
          <v-text-field
            v-model="fromInput"
            label="From (ISO date-time)"
            hint="Leave empty for all rows"
            density="comfortable"
            hide-details="auto"
            class="flex-grow-1"
            style="max-width: 28rem"
            autocomplete="off"
          />
          <v-btn
            color="primary"
            variant="flat"
            :loading="loading"
            :disabled="loading || sealPending"
            @click="reloadFromStart"
          >
            Apply
          </v-btn>
          <v-btn
            v-if="sealEnabled"
            color="secondary"
            variant="tonal"
            :loading="sealPending"
            :disabled="loading || sealPending"
            @click="onSeal"
          >
            Seal &amp; ship archive
          </v-btn>
        </div>

        <p v-if="rows.length > 0" class="text-body-2 text-medium-emphasis mb-2">
          Loaded: {{ rows.length }}
        </p>

        <v-data-table
          class="audit-log-table"
          :headers="headers"
          :items="tableItems"
          :items-per-page="-1"
          hide-default-footer
          density="compact"
        />

        <div class="mt-4">
          <v-btn
            color="primary"
            variant="outlined"
            :disabled="!nextCursor || loading || sealPending"
            :loading="loading"
            @click="loadMore"
          >
            Load more
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import type { AuditLog } from "@saflib/audit-spec/types";
import { useSealAuditLog } from "@saflib/audit-sdk/requests/seal-audit-log";
import { getTanstackErrorMessage, TanstackError } from "@saflib/sdk";
import { showError, showInfo } from "@saflib/vue";
import { computed, onMounted, ref } from "vue";
import { createSafClient, handleClientMethod } from "@saflib/sdk";
import type { paths } from "@saflib/audit-spec/types";

const props = withDefaults(
  defineProps<{
    subdomain?: string;
    description?: string;
    sealEnabled?: boolean;
  }>(),
  {
    subdomain: "api",
    sealEnabled: false,
  },
);

const PAGE_SIZE = 50;

const fromInput = ref("");
const appliedFrom = ref<string | undefined>(undefined);
const rows = ref<AuditLog[]>([]);
const nextCursor = ref<string | null>(null);
const spanHead = ref<string | null>(null);
const spanTail = ref<string | null>(null);
const spanChecked = ref(false);
const loading = ref(false);

const sealMutation = useSealAuditLog(props.subdomain);
const sealPending = computed(() => sealMutation.isPending.value);

const headers = [
  { title: "Time", key: "ts", sortable: false },
  { title: "Source", key: "source", sortable: false },
  { title: "Event", key: "eventType", sortable: false },
  { title: "Outcome", key: "outcome", sortable: false },
  { title: "Actor", key: "actorUserId", sortable: false },
  { title: "Resource", key: "resource", sortable: false },
  { title: "Request", key: "requestId", sortable: false },
  { title: "Details", key: "details", sortable: false },
];

const tableItems = computed(() =>
  rows.value.map((r) => ({
    ...r,
    resource: [r.resourceType, r.resourceId].filter(Boolean).join(" ") || "—",
    details: formatDetails(r.details),
  })),
);

function formatDetails(details: AuditLog["details"]): string {
  if (details == null) return "—";
  try {
    const s = JSON.stringify(details);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  } catch {
    return "—";
  }
}

function parseFromFilter(): { ok: true; from?: string } | { ok: false } {
  const raw = fromInput.value.trim();
  if (!raw) return { ok: true };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    showError("Invalid start time — use ISO-8601.");
    return { ok: false };
  }
  return { ok: true, from: d.toISOString() };
}

async function fetchPage(append: boolean) {
  loading.value = true;
  try {
    const client = createSafClient<paths>(props.subdomain);
    const data = await handleClientMethod(
      client.GET("/audit-logs", {
        params: {
          query: {
            ...(appliedFrom.value ? { from: appliedFrom.value } : {}),
            ...(append && nextCursor.value ? { cursor: nextCursor.value } : {}),
            limit: PAGE_SIZE,
            order: "desc",
          },
        },
      }),
    );

    if (!append) {
      rows.value = [];
    }
    rows.value = rows.value.concat(data.auditLogs);
    nextCursor.value = data.nextCursor;
    spanHead.value = data.headAt;
    spanTail.value = data.tailAt;
    spanChecked.value = true;
  } catch (e: unknown) {
    const message =
      e instanceof TanstackError
        ? getTanstackErrorMessage(e)
        : e instanceof Error
          ? e.message
          : String(e ?? "Unknown error");
    showError(message);
  } finally {
    loading.value = false;
  }
}

function reloadFromStart() {
  const parsed = parseFromFilter();
  if (!parsed.ok) return;
  appliedFrom.value = parsed.from;
  nextCursor.value = null;
  void fetchPage(false);
}

function loadMore() {
  void fetchPage(true);
}

async function onSeal() {
  try {
    const result = await sealMutation.mutateAsync();
    const ar = result.auditSealResult;
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

onMounted(() => {
  void fetchPage(false);
});
</script>

<style scoped>
.audit-log-table :deep(th) {
  white-space: nowrap;
}
.audit-log-table :deep(td) {
  vertical-align: top;
}
</style>
