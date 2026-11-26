<template>
  <ContentWidth variant="full">
    <h1 class="text-h4 mb-4">{{ strings.title }}</h1>

    <v-data-table
      v-if="jobs && jobs.length > 0"
      :headers="headers"
      :items="jobs"
      item-value="job_name"
      class="elevation-1"
      density="compact"
    >
      <template #[`item.enabled`]="{ item }">
        <v-chip :color="item.enabled ? 'success' : 'error'">
          {{ item.enabled ? "Enabled" : "Disabled" }}
        </v-chip>
        <v-chip
          v-if="item.enabled && !item.enabled_by"
          color="warning"
          class="ml-2"
          size="small"
        >
          Re-enable required
        </v-chip>
      </template>

      <template #[`item.enabled_by`]="{ item }">
        <UserRef v-if="item.enabled_by" :id="item.enabled_by" />
        <span v-else-if="item.enabled" class="text-warning">
          Missing — re-enable to record authority (job is not running)
        </span>
        <span v-else>N/A</span>
      </template>

      <template #[`item.last_run_status`]="{ item }">
        <v-chip
          v-if="item.last_run_status"
          :color="statusColor(item.last_run_status)"
        >
          {{ item.last_run_status }}
        </v-chip>
        <span v-else>N/A</span>
      </template>

      <template #[`item.last_run_at`]="{ item }">
        <span class="text-no-wrap">{{ formatDateTime(item.last_run_at) }}</span>
      </template>

      <template #[`item.runs_next_at`]="{ item }">
        <span class="text-no-wrap">{{ formatRunsNext(item) }}</span>
      </template>

      <template #[`item.actions`]="{ item }">
        <v-btn
          size="small"
          variant="text"
          color="primary"
          :loading="isUpdating && updatingJobId === item.job_name"
          :disabled="isUpdating"
          @click="toggleJobStatus(item.job_name, !item.enabled)"
        >
          {{ item.enabled ? "Disable" : "Enable" }}
        </v-btn>
      </template>

      <template #bottom></template>
    </v-data-table>
    <p v-else class="text-body-1">{{ strings.empty }}</p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { UserRef } from "@saflib/ory-kratos-vue";
import type { JobSettings } from "@saflib/cron-spec";
import { useCronJobsPageLoader } from "./CronJobs.loader.ts";
import { cron_jobs as strings } from "./CronJobs.strings.ts";

const updatingJobId = ref<string | null>(null);

const headers = [
  { title: "Job", key: "job_name", sortable: true },
  { title: "Status", key: "enabled", sortable: true },
  { title: "Enabled by", key: "enabled_by", sortable: true },
  { title: "Last run", key: "last_run_status", sortable: true },
  { title: "Last run at", key: "last_run_at", sortable: true },
  { title: "Runs next", key: "runs_next_at", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

const { jobsQuery, updateMutation } = useCronJobsPageLoader();
const jobs = computed(() => jobsQuery.data.value);

const { mutate: updateSettings, isPending: isUpdating } = updateMutation;

const toggleJobStatus = (jobName: string, enabled: boolean) => {
  updatingJobId.value = jobName;
  updateSettings(
    { job_name: jobName, enabled },
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
    return dateTimeString;
  }
};

const formatRunsNext = (item: JobSettings): string => {
  if (!item.enabled) {
    return "—";
  }
  if (item.enabled && !item.enabled_by) {
    return "Re-enable required";
  }
  if (!item.runs_next_at) {
    return item.schedule ? "Unknown" : "—";
  }
  return formatDateTime(item.runs_next_at);
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
