<template>
  <v-container>
    <v-row>
      <v-col>
        <h1 class="text-h4 mb-4">Cron Jobs</h1>

        <v-progress-linear v-if="isLoadingJobs" indeterminate />

        <v-alert v-if="jobsError" type="error" class="mb-4">
          Error loading cron jobs: {{ jobsError.message }}
        </v-alert>

        <v-alert v-if="updateError" type="error" class="mb-4">
          Error updating cron job: {{ updateError.message }}
        </v-alert>

        <v-data-table
          v-if="jobs && jobs.length > 0"
          :headers="headers"
          :items="jobs"
          item-value="jobName"
          class="elevation-1"
        >
          <template #[`item.enabled`]="{ item }">
            <v-chip :color="item.enabled ? 'success' : 'error'">
              {{ item.enabled ? "Enabled" : "Disabled" }}
            </v-chip>
          </template>

          <template #[`item.lastRunStatus`]="{ item }">
            <v-chip
              v-if="item.lastRunStatus"
              :color="statusColor(item.lastRunStatus)"
            >
              {{ item.lastRunStatus }}
            </v-chip>
            <span v-else>N/A</span>
          </template>

          <template #[`item.lastRunAt`]="{ item }">
            {{ formatDateTime(item.lastRunAt) }}
          </template>
          <template #[`item.createdAt`]="{ item }">
            {{ formatDateTime(item.createdAt) }}
          </template>
          <template #[`item.updatedAt`]="{ item }">
            {{ formatDateTime(item.updatedAt) }}
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn
              size="small"
              :loading="isUpdating && updatingJobId === item.jobName"
              :disabled="isUpdating"
              @click="toggleJobStatus(item.jobName, !item.enabled)"
            >
              {{ item.enabled ? "Disable" : "Enable" }}
            </v-btn>
          </template>

          <template #bottom></template>
          <!-- Optional: Removes default footer -->
        </v-data-table>
        <p v-else-if="!isLoadingJobs && !jobsError" class="text-body-1">
          No cron jobs found.
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useListCronJobs, useUpdateCronJobSettings } from "../requests/queries";

const { subdomain } = defineProps<{
  subdomain: string;
}>();

const updatingJobId = ref<string | null>(null);

const headers = [
  { title: "Job Name", key: "jobName", sortable: true },
  { title: "Status", key: "enabled", sortable: true },
  { title: "Last Run Status", key: "lastRunStatus", sortable: true },
  { title: "Last Run At", key: "lastRunAt", sortable: true },
  { title: "Created At", key: "createdAt", sortable: true },
  { title: "Updated At", key: "updatedAt", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

const {
  data: jobs,
  isLoading: isLoadingJobs,
  error: jobsError,
} = useListCronJobs(subdomain);

const {
  mutate: updateSettings,
  isPending: isUpdating,
  error: updateError,
} = useUpdateCronJobSettings(subdomain);

const toggleJobStatus = (jobName: string, enabled: boolean) => {
  updatingJobId.value = jobName;
  updateSettings(
    { jobName, enabled },
    {
      onSettled: () => {
        updatingJobId.value = null;
      },
    },
  );
};

const formatDateTime = (dateTimeString: string | null | undefined): string => {
  if (!dateTimeString) return "N/A";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateTimeString));
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateTimeString; // Fallback to original string if formatting fails
  }
};

const statusColor = (status: string | null | undefined): string => {
  switch (status) {
    case "success":
      return "success";
    case "fail":
      return "error";
    case "running":
      return "info";
    case "timed out":
      return "warning";
    default:
      return "grey";
  }
};
</script>
