<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">{{ t(strings.title) }}</h1>
        <p class="text-subtitle-1 text-medium-emphasis mb-4">
          {{ t(strings.subtitle) }}
        </p>
        <p class="text-body-2 text-medium-emphasis mb-6">
          {{ t(strings.description) }}
        </p>
      </v-col>
    </v-row>

    <v-row v-if="backups.length === 0">
      <v-col cols="12">
        <v-card>
          <v-card-text class="text-center">
            {{ t(strings.no_backups) }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <v-card>
          <v-table>
            <thead>
              <tr>
                <th class="text-left">{{ t(strings.backup_id_label) }}</th>
                <th class="text-left">{{ t(strings.backup_type_label) }}</th>
                <th class="text-left">{{ t(strings.backup_timestamp_label) }}</th>
                <th class="text-left">{{ t(strings.backup_size_label) }}</th>
                <th class="text-left">{{ t(strings.backup_path_label) }}</th>
                <th class="text-left" v-if="hasMetadata">{{ t(strings.backup_metadata_label) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="backup in backups" :key="backup.id">
                <td>{{ backup.id }}</td>
                <td>
                  <v-chip
                    :color="backup.type === 'manual' ? 'primary' : 'secondary'"
                    size="small"
                    variant="flat"
                  >
                    {{
                      backup.type === "manual"
                        ? t(strings.type_manual)
                        : t(strings.type_automatic)
                    }}
                  </v-chip>
                </td>
                <td>{{ formatTimestamp(backup.timestamp) }}</td>
                <td>{{ formatSize(backup.size) }}</td>
                <td class="text-truncate">
                  {{ backup.path }}
                </td>
                <td v-if="hasMetadata">
                  <div v-if="backup.metadata">
                    <div
                      v-for="(value, key) in backup.metadata"
                      :key="key"
                      class="text-caption"
                    >
                      <strong>{{ key }}:</strong> {{ value }}
                    </div>
                  </div>
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { backup_manager_page as strings } from "./BackupManager.strings.ts";
import { useBackupManagerLoader } from "./BackupManager.loader.ts";
import { useReverseT } from "../../i18n.ts";

const { t } = useReverseT();

const { backupsQuery } = useBackupManagerLoader();

if (backupsQuery.data.value === undefined || backupsQuery.data.value === null) {
  throw new Error("Failed to load backups");
}

const backups = computed(() => backupsQuery.data.value ?? []);

const hasMetadata = computed(() => {
  return backups.value.some((backup) => backup.metadata);
});

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};
</script>
