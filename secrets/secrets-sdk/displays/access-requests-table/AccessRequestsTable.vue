<template>
  <v-card>
    <v-card-title>
      <h2>{{ t(strings.title) }}</h2>
    </v-card-title>

    <v-card-subtitle>
      {{ t(strings.description) }}
    </v-card-subtitle>

    <v-card-text>
      <!-- Loading skeleton -->
      <div v-if="loading" class="mb-4">
        <v-skeleton-loader
          type="table-heading, table-thead, table-tbody, table-tbody, table-tbody"
          class="elevation-1"
        ></v-skeleton-loader>
      </div>

      <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
        {{ getErrorMessage(error) }}
      </v-alert>

      <v-alert
        v-else-if="!accessRequests || accessRequests.length === 0"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        {{ t(strings.empty) }}
      </v-alert>

      <v-data-table
        v-else
        :headers="headers"
        :items="accessRequests"
        :items-per-page="10"
        class="elevation-1"
      >
        <template v-slot:item.secret_name="{ item }">
          <span class="font-weight-medium">{{ item.secret_name }}</span>
        </template>

        <template v-slot:item.service_name="{ item }">
          <v-chip color="primary" size="small" variant="outlined">
            {{ item.service_name }}
          </v-chip>
        </template>

        <template v-slot:item.status="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            size="small"
            variant="tonal"
          >
            {{ t(getStatusText(item.status)) }}
          </v-chip>
        </template>

        <template v-slot:item.requested_at="{ item }">
          <span class="text-caption text-grey">
            {{ formatDate(item.requested_at) }}
          </span>
        </template>

        <template v-slot:item.access_count="{ item }">
          <v-chip color="info" size="small" variant="outlined">
            {{ item.access_count }}
          </v-chip>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            icon="mdi-check"
            size="small"
            :variant="item.status === 'granted' ? 'flat' : 'text'"
            :color="item.status === 'granted' ? 'success' : 'success'"
            @click="onApprove(item)"
            :title="t(strings.approve)"
          ></v-btn>
          <v-btn
            icon="mdi-close"
            size="small"
            :variant="item.status === 'denied' ? 'flat' : 'text'"
            :color="item.status === 'denied' ? 'error' : 'error'"
            @click="onDeny(item)"
            :title="t(strings.deny)"
          ></v-btn>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { access_requests_table_strings as strings } from "./AccessRequestsTable.strings.ts";
import { useReverseT } from "../../i18n.ts";
import { getTanstackErrorMessage } from "@saflib/sdk";
import { useApproveAccessRequest } from "../../requests/access-requests/approve.ts";
import type { AccessRequest } from "@saflib/secrets-spec";

const { t } = useReverseT();

interface Props {
  accessRequests: AccessRequest[];
  loading?: boolean;
  error?: any;
}

const props = defineProps<Props>();

// Use mutation for approving/denying requests
const approveMutation = useApproveAccessRequest();

const onApprove = async (request: any) => {
  await approveMutation.mutateAsync({
    id: request.id,
    approved: true,
    reason: "Approved via admin interface",
  });
};

const onDeny = async (request: any) => {
  await approveMutation.mutateAsync({
    id: request.id,
    approved: false,
    reason: "Denied via admin interface",
  });
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "warning";
    case "granted":
      return "success";
    case "denied":
      return "error";
    default:
      return "grey";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "pending":
      return strings.pending;
    case "granted":
      return strings.granted;
    case "denied":
      return strings.denied;
    default:
      return status;
  }
};

const getErrorMessage = (error: any) => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return getTanstackErrorMessage(error);
};

const headers = [
  { title: t(strings.secretName), key: "secret_name", sortable: true },
  { title: t(strings.serviceName), key: "service_name", sortable: true },
  { title: t(strings.status), key: "status", sortable: true },
  { title: t(strings.requested), key: "requested_at", sortable: true },
  { title: t(strings.accessCount), key: "access_count", sortable: true },
  { title: t(strings.actions), key: "actions", sortable: false },
];
</script>
