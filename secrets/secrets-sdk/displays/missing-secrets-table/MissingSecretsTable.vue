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
        v-else-if="!missingSecrets || missingSecrets.length === 0"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        {{ t(strings.empty) }}
      </v-alert>

      <v-data-table
        v-else
        :headers="headers"
        :items="missingSecrets"
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
            variant="flat"
          >
            {{ getStatusText(item.status) }}
          </v-chip>
        </template>

        <template v-slot:item.requested_at="{ item }">
          <span class="text-caption">{{ formatDate(item.requested_at) }}</span>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            icon="mdi-plus"
            size="small"
            variant="text"
            color="success"
            @click="onCreateSecret(item)"
            :title="t(strings.createSecret)"
          ></v-btn>
          <v-btn
            icon="mdi-eye"
            size="small"
            variant="text"
            color="info"
            @click="onViewDetails(item)"
            :title="t(strings.viewDetails)"
          ></v-btn>
        </template>
      </v-data-table>
    </v-card-text>

    <!-- Details Modal -->
    <v-dialog v-model="showDetailsModal" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ t(strings.detailsTitle) }}</span>
        </v-card-title>

        <v-card-text v-if="selectedRequest">
          <v-table>
            <tbody>
              <tr>
                <td class="font-weight-medium">{{ t(strings.secretName) }}</td>
                <td>{{ selectedRequest.secret_name }}</td>
              </tr>
              <tr>
                <td class="font-weight-medium">{{ t(strings.serviceName) }}</td>
                <td>
                  <v-chip color="primary" size="small" variant="outlined">
                    {{ selectedRequest.service_name }}
                  </v-chip>
                </td>
              </tr>
              <tr>
                <td class="font-weight-medium">{{ t(strings.status) }}</td>
                <td>
                  <v-chip
                    :color="getStatusColor(selectedRequest.status)"
                    size="small"
                    variant="flat"
                  >
                    {{ getStatusText(selectedRequest.status) }}
                  </v-chip>
                </td>
              </tr>
              <tr>
                <td class="font-weight-medium">{{ t(strings.requested) }}</td>
                <td>{{ formatDate(selectedRequest.requested_at) }}</td>
              </tr>
              <tr v-if="selectedRequest.granted_at">
                <td class="font-weight-medium">{{ t(strings.grantedAt) }}</td>
                <td>{{ formatDate(selectedRequest.granted_at) }}</td>
              </tr>
              <tr v-if="selectedRequest.granted_by">
                <td class="font-weight-medium">{{ t(strings.grantedBy) }}</td>
                <td>{{ selectedRequest.granted_by }}</td>
              </tr>
              <tr>
                <td class="font-weight-medium">{{ t(strings.accessCount) }}</td>
                <td>{{ selectedRequest.access_count }}</td>
              </tr>
              <tr v-if="selectedRequest.last_accessed_at">
                <td class="font-weight-medium">
                  {{ t(strings.lastAccessed) }}
                </td>
                <td>{{ formatDate(selectedRequest.last_accessed_at) }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="text"
            @click="showDetailsModal = false"
          >
            {{ t(strings.close) }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { missing_secrets_table_strings as strings } from "./MissingSecretsTable.strings.ts";
import { useReverseT } from "../../i18n.ts";
import { getTanstackErrorMessage } from "@saflib/sdk";
import type { AccessRequest } from "@saflib/secrets-spec";
import { ref } from "vue";

const { t } = useReverseT();

interface Props {
  missingSecrets: AccessRequest[];
  loading?: boolean;
  error?: any;
}

defineProps<Props>();

const emit = defineEmits<{
  createSecret: [request: AccessRequest];
  viewDetails: [request: AccessRequest];
}>();

// Modal state
const showDetailsModal = ref(false);
const selectedRequest = ref<AccessRequest | null>(null);

const onCreateSecret = (request: AccessRequest) => {
  emit("createSecret", request);
};

const onViewDetails = (request: AccessRequest) => {
  selectedRequest.value = request;
  showDetailsModal.value = true;
  emit("viewDetails", request);
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "missing":
      return "error";
    case "pending":
      return "warning";
    case "available":
      return "success";
    default:
      return "grey";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "missing":
      return strings.missing;
    case "pending":
      return strings.pending;
    case "available":
      return strings.available;
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
  { title: t(strings.actions), key: "actions", sortable: false },
];
</script>
