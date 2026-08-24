<template>
  <v-container fluid class="audit-log-page">
    <v-row>
      <v-col>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <h1 class="text-h4 mb-0">Audit log</h1>
          <v-chip
            size="small"
            :color="chainValid ? 'success' : 'error'"
            variant="tonal"
          >
            Chain {{ chainValid ? "OK" : "INVALID" }}
          </v-chip>
          <v-chip size="small" variant="tonal">
            {{ auditLogs.length }} rows
          </v-chip>
          <v-btn
            size="small"
            variant="tonal"
            :loading="isLoading"
            @click="refetch()"
          >
            Refresh
          </v-btn>
        </div>

        <v-alert v-if="error" type="error" class="mb-4">
          Error loading audit log: {{ error.message }}
        </v-alert>

        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-text-field
            v-model="fromFilter"
            label="From (ISO date-time)"
            type="search"
            density="compact"
            hide-details
            clearable
            style="min-width: 220px; max-width: 320px"
          />
          <v-select
            v-model="orderFilter"
            label="Order"
            :items="orderOptions"
            density="compact"
            hide-details
            style="min-width: 140px; max-width: 180px"
          />
        </div>

        <v-table density="compact" class="audit-log-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event</th>
              <th>Resource</th>
              <th>Outcome</th>
              <th>Actor</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in auditLogs"
              :key="row.id"
              :class="{ 'selected-row': selectedRow?.id === row.id }"
              @click="selectedRow = row"
            >
              <td>{{ row.ts }}</td>
              <td>{{ row.eventType }}</td>
              <td>
                <span v-if="row.resourceType">
                  {{ row.resourceType }}
                  <span v-if="row.resourceId">({{ row.resourceId }})</span>
                </span>
              </td>
              <td>{{ row.outcome }}</td>
              <td>{{ row.actorUserId ?? "—" }}</td>
              <td>
                <pre class="details-json">{{ formatDetails(row) }}</pre>
              </td>
            </tr>
          </tbody>
        </v-table>

        <p v-if="auditLogs.length === 0 && !isLoading" class="audit-empty">
          No audit events recorded yet.
        </p>

        <v-card v-if="selectedRow" class="mt-4" variant="outlined">
          <v-card-title class="text-subtitle-1">Row detail</v-card-title>
          <v-card-text>
            <pre class="row-detail-json">{{ formatRowDetail(selectedRow) }}</pre>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { AuditLog } from "@saflib/audit-spec";
import { useListAuditLogs } from "@saflib/audit-sdk";

const props = withDefaults(
  defineProps<{
    /** API subdomain (typically `api`). */
    subdomain?: string;
  }>(),
  { subdomain: "api" },
);

const fromFilter = ref("");
const orderFilter = ref<"asc" | "desc">("desc");
const selectedRow = ref<AuditLog | null>(null);

const orderOptions = [
  { title: "Newest first", value: "desc" },
  { title: "Oldest first", value: "asc" },
];

const { data, error, isLoading, refetch } = useListAuditLogs(props.subdomain, {
  from: fromFilter,
  order: orderFilter,
});

const auditLogs = computed(() => data.value?.auditLogs ?? []);
const chainValid = computed(() => data.value?.chainValid ?? true);

function formatDetails(row: AuditLog): string {
  if (row.details == null) return "—";
  return JSON.stringify(row.details, null, 2);
}

function formatRowDetail(row: AuditLog): string {
  return JSON.stringify(row, null, 2);
}
</script>

<style scoped>
.audit-log-table tbody tr {
  cursor: pointer;
}
.selected-row {
  background: rgba(var(--v-theme-primary), 0.08);
}
.details-json,
.row-detail-json {
  margin: 0;
  max-width: 280px;
  max-height: 120px;
  overflow: auto;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.row-detail-json {
  max-width: none;
  max-height: none;
}
.audit-empty {
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
