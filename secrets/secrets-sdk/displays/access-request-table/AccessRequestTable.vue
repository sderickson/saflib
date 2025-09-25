<template>
  <v-card>
    <v-card-title>
      <h2>{{ t(strings.title) }}</h2>
    </v-card-title>

    <v-card-subtitle>
      {{ t(strings.description) }}
    </v-card-subtitle>

    <v-card-text>
      <v-table>
        <tbody>
          <tr>
            <td class="font-weight-medium">{{ t(strings.secretName) }}</td>
            <td>{{ accessRequest.secret_name }}</td>
          </tr>
          <tr>
            <td class="font-weight-medium">{{ t(strings.serviceName) }}</td>
            <td>
              <v-chip color="primary" size="small" variant="outlined">
                {{ accessRequest.service_name }}
              </v-chip>
            </td>
          </tr>
          <tr>
            <td class="font-weight-medium">{{ t(strings.status) }}</td>
            <td>
              <v-chip
                :color="getStatusColor(accessRequest.status)"
                size="small"
                variant="flat"
              >
                {{ getStatusText(accessRequest.status) }}
              </v-chip>
            </td>
          </tr>
          <tr>
            <td class="font-weight-medium">{{ t(strings.requested) }}</td>
            <td>{{ formatDate(accessRequest.requested_at) }}</td>
          </tr>
          <tr v-if="accessRequest.granted_at">
            <td class="font-weight-medium">{{ t(strings.grantedAt) }}</td>
            <td>{{ formatDate(accessRequest.granted_at) }}</td>
          </tr>
          <tr v-if="accessRequest.granted_by">
            <td class="font-weight-medium">{{ t(strings.grantedBy) }}</td>
            <td>{{ accessRequest.granted_by }}</td>
          </tr>
          <tr>
            <td class="font-weight-medium">{{ t(strings.accessCount) }}</td>
            <td>{{ accessRequest.access_count }}</td>
          </tr>
          <tr v-if="accessRequest.last_accessed_at">
            <td class="font-weight-medium">{{ t(strings.lastAccessed) }}</td>
            <td>{{ formatDate(accessRequest.last_accessed_at) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { access_request_table_strings as strings } from "./AccessRequestTable.strings.ts";
import { useReverseT } from "../../i18n.ts";
import type { AccessRequest } from "@saflib/secrets-spec";

const { t } = useReverseT();

defineProps<{
  accessRequest: AccessRequest;
}>();

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
</script>
