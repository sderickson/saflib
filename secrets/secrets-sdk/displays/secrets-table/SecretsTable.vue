<template>
  <v-card>
    <v-card-title>
      <h2>{{ t(strings.title) }}</h2>
    </v-card-title>

    <v-card-subtitle>
      {{ t(strings.description) }}
    </v-card-subtitle>

    <v-card-text>
      <v-progress-circular
        v-if="loading"
        indeterminate
        color="primary"
        class="mx-auto d-block"
      ></v-progress-circular>

      <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
        {{ t(strings.error) }}: {{ error }}
      </v-alert>

      <v-alert
        v-else-if="secrets.length === 0"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        {{ t(strings.empty) }}
      </v-alert>

      <v-data-table
        v-else
        :headers="headers"
        :items="secrets"
        :items-per-page="10"
        class="elevation-1"
      >
        <template v-slot:item.name="{ item }">
          <span class="font-weight-medium">{{ item.name }}</span>
        </template>

        <template v-slot:item.description="{ item }">
          <span>{{ item.description || "-" }}</span>
        </template>

        <template v-slot:item.masked_value="{ item }">
          <v-chip color="grey-lighten-2" size="small" variant="outlined">
            {{ item.masked_value }}
          </v-chip>
        </template>

        <template v-slot:item.is_active="{ item }">
          <v-chip
            :color="item.is_active ? 'success' : 'error'"
            size="small"
            variant="tonal"
          >
            {{ item.is_active ? t(strings.active) : t(strings.inactive) }}
          </v-chip>
        </template>

        <template v-slot:item.updated_at="{ item }">
          <span class="text-caption text-grey">
            {{ formatDate(item.updated_at) }}
          </span>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            color="primary"
            @click="onEdit(item)"
            :title="t(strings.editSecret)"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="onDelete(item)"
            :title="t(strings.deleteSecret)"
          ></v-btn>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { secrets_table_strings as strings } from "./SecretsTable.strings.ts";
import { useReverseT } from "../../i18n.ts";
import type { Secret } from "@saflib/secrets-spec";

const { t } = useReverseT();

interface Props {
  secrets: Secret[];
  loading?: boolean;
  error?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  edit: [secret: Secret];
  delete: [secret: Secret];
}>();

const onEdit = (secret: Secret) => {
  emit("edit", secret);
};

const onDelete = (secret: Secret) => {
  emit("delete", secret);
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const headers = [
  { title: t(strings.name), key: "name", sortable: true },
  { title: t(strings.descriptionColumn), key: "description", sortable: true },
  { title: t(strings.value), key: "masked_value", sortable: false },
  { title: t(strings.status), key: "is_active", sortable: true },
  { title: t(strings.updated), key: "updated_at", sortable: true },
  { title: t(strings.actions), key: "actions", sortable: false },
];
</script>
