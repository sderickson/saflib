<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-4">{{ strings.title }}</AdminPageTitle>

    <v-data-table
      v-if="jobs && jobs.length > 0"
      :headers="headers"
      :items="jobs"
      item-value="job_name"
      class="elevation-1"
      density="compact"
    >
      <template #[`item.enabled`]="{ item }">
        <v-tooltip v-if="item.enabled && item.enabled_by" location="top">
          <template #activator="{ props: tip }">
            <v-chip v-bind="tip" color="success" size="small" data-test="cron-status">Enabled</v-chip>
          </template>
          <span>Enabled by <UserRef :id="item.enabled_by" variant="compact" /></span>
        </v-tooltip>
        <v-chip v-else :color="item.enabled ? 'success' : undefined" size="small" data-test="cron-status">
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

      <template #[`item.last_run_status`]="{ item }">
        <span v-if="item.last_run_status" class="d-inline-flex align-center ga-2 text-no-wrap">
          <v-chip :color="statusColor(item.last_run_status)" size="small">{{ item.last_run_status }}</v-chip>
          <span class="text-medium-emphasis">{{ formatShortDateTime(item.last_run_at) }}</span>
        </span>
        <span v-else class="text-medium-emphasis">Never</span>
      </template>

      <template #[`item.runs_next_at`]="{ item }">
        <span class="text-no-wrap">{{ formatRunsNext(item) }}</span>
      </template>

      <template #[`item.actions`]="{ item }">
        <v-btn
          :icon="item.enabled ? 'mdi-pause' : 'mdi-play'"
          size="small"
          variant="text"
          color="primary"
          :title="item.enabled ? 'Disable' : 'Enable'"
          :aria-label="`${item.enabled ? 'Disable' : 'Enable'} ${item.job_name}`"
          :loading="isUpdating && updatingJobId === item.job_name"
          :disabled="isUpdating"
          @click="toggleJobStatus(item.job_name, !item.enabled)"
        />
      </template>

      <template #bottom></template>
    </v-data-table>
    <p v-else class="text-body-1">{{ strings.empty }}</p>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { AdminPageTitle, ContentWidth } from "@saflib/vue/components";
import { UserRef } from "@saflib/ory-kratos-vue";
import type { JobSettings } from "@saflib/cron-spec";
import { formatShortDateTime } from "@saflib/vue";
import { useCronJobsPageLoader } from "./CronJobs.loader.ts";
import { cron_jobs as strings } from "./CronJobs.strings.ts";

const updatingJobId = ref<string | null>(null);

// Who enabled a job is on hover over its status.
const wide = { headerProps: { class: "saf-admin-hide-xs" }, cellProps: { class: "saf-admin-hide-xs" } };
const headers = [
  { title: "Job", key: "job_name", sortable: true },
  { title: "Status", key: "enabled", sortable: true, ...wide },
  { title: "Last run", key: "last_run_status", sortable: true },
  { title: "Next run", key: "runs_next_at", sortable: true, ...wide },
  { title: "", key: "actions", sortable: false, align: "end" as const },
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
  return formatShortDateTime(item.runs_next_at);
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
