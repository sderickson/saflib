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
        v-else-if="!serviceTokens || serviceTokens.length === 0"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        {{ t(strings.empty) }}
      </v-alert>

      <v-data-table
        v-else
        :headers="headers"
        :items="serviceTokens"
        :items-per-page="10"
        class="elevation-1"
      >
        <template v-slot:item.service_name="{ item }">
          <v-chip color="primary" size="small" variant="outlined">
            {{ item.service_name }}
          </v-chip>
        </template>

        <template v-slot:item.token_hash="{ item }">
          <span class="font-mono text-caption">{{ item.token_hash }}</span>
        </template>

        <template v-slot:item.approved="{ item }">
          <v-chip
            :color="item.approved ? 'success' : 'warning'"
            size="small"
            variant="flat"
          >
            {{ item.approved ? t(strings.approvedStatus) : t(strings.pending) }}
          </v-chip>
        </template>

        <template v-slot:item.requested_at="{ item }">
          <span class="text-caption">{{ formatDate(item.requested_at) }}</span>
        </template>

        <template v-slot:item.approved_at="{ item }">
          <span v-if="item.approved_at" class="text-caption">
            {{ formatDate(item.approved_at) }}
          </span>
          <span v-else class="text-caption text-grey">-</span>
        </template>

        <template v-slot:item.approved_by="{ item }">
          <span v-if="item.approved_by" class="text-caption">
            {{ item.approved_by }}
          </span>
          <span v-else class="text-caption text-grey">-</span>
        </template>

        <template v-slot:item.access_count="{ item }">
          <span class="font-weight-medium">{{ item.access_count }}</span>
        </template>

        <template v-slot:item.last_used_at="{ item }">
          <span v-if="item.last_used_at" class="text-caption">
            {{ formatDate(item.last_used_at) }}
          </span>
          <span v-else class="text-caption text-grey">Never</span>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            v-if="!item.approved"
            icon="mdi-check"
            size="small"
            variant="text"
            color="success"
            @click="onApprove(item)"
            :title="t(strings.approveToken)"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="onDelete(item)"
            :title="t(strings.deleteToken)"
          ></v-btn>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { service_tokens_table_strings as strings } from "./ServiceTokensTable.strings.ts";
import { useReverseT } from "../../i18n.ts";
import { getTanstackErrorMessage } from "@saflib/sdk";
import type { ServiceToken } from "@saflib/secrets-spec";

const { t } = useReverseT();

interface Props {
  serviceTokens: ServiceToken[];
  loading?: boolean;
  error?: any;
}

defineProps<Props>();

const emit = defineEmits<{
  approve: [token: ServiceToken];
  delete: [token: ServiceToken];
}>();

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const onApprove = (token: ServiceToken) => {
  emit("approve", token);
};

const onDelete = (token: ServiceToken) => {
  emit("delete", token);
};

const getErrorMessage = (error: any) => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return getTanstackErrorMessage(error);
};

const headers = [
  { title: t(strings.serviceName), key: "service_name", sortable: true },
  { title: t(strings.tokenHash), key: "token_hash", sortable: false },
  { title: t(strings.approved), key: "approved", sortable: true },
  { title: t(strings.requested), key: "requested_at", sortable: true },
  { title: t(strings.approvedAt), key: "approved_at", sortable: true },
  { title: t(strings.approvedBy), key: "approved_by", sortable: true },
  { title: t(strings.accessCount), key: "access_count", sortable: true },
  { title: t(strings.lastUsed), key: "last_used_at", sortable: true },
  { title: t(strings.actions), key: "actions", sortable: false },
];
</script>
