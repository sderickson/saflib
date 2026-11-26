<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-4">{{ strings.title }}</AdminPageTitle>

    <AdminToolbar label="Job filters" :active-filters="activeFilterCount">
      <v-text-field
        v-model="operationIdFilter"
        placeholder="Filter by operation"
        prepend-inner-icon="mdi-magnify"
        clearable
      />
      <v-chip
        v-if="originalRequestIdFilter"
        closable
        variant="outlined"
        close-label="Show all requests"
        data-test="jobs-request-filter"
        @click:close="originalRequestIdFilter = ''"
      >
        <span class="text-medium-emphasis me-1">Request</span>
        <ShortId :id="originalRequestIdFilter" prefix="r" />
      </v-chip>
      <template #actions>
        <v-btn icon="mdi-chevron-left" size="small" variant="text" title="Previous page" aria-label="Previous page" :disabled="offset === 0" @click="prevPage" />
        <v-btn icon="mdi-chevron-right" size="small" variant="text" title="Next page" aria-label="Next page" :disabled="!hasNextPage" @click="nextPage" />
      </template>
      <template #filters>
        <v-select v-model="statusFilter" :items="statusOptions" label="Status" clearable />
        <UserPicker :model-value="userIdFilter || null" label="Started by" @update:model-value="(id) => (userIdFilter = id ?? '')" />
      </template>
    </AdminToolbar>

    <v-progress-linear
      v-if="isLoadingJobs"
      indeterminate
      data-testid="jobs-loading"
    />

    <v-alert v-if="mutationError" type="error" class="mb-4">
      Error updating job: {{ mutationError.message }}
    </v-alert>

    <div v-if="selected.length" class="jobs-bulk d-flex flex-wrap align-center ga-2 mb-2" data-test="jobs-bulk">
      <span class="text-body-2">{{ selected.length }} selected</span>
      <v-btn
        size="small"
        variant="outlined"
        prepend-icon="mdi-replay"
        :disabled="!retryable.length || isMutating"
        :loading="bulkAction === 'retry'"
        data-test="jobs-bulk-retry"
        @click="bulk('retry')"
      >
        Retry {{ retryable.length }}
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        color="error"
        prepend-icon="mdi-cancel"
        :disabled="!cancellable.length || isMutating"
        :loading="bulkAction === 'cancel'"
        data-test="jobs-bulk-cancel"
        @click="bulk('cancel')"
      >
        Cancel {{ cancellable.length }}
      </v-btn>
      <v-btn size="small" variant="text" @click="selected = []">Clear</v-btn>
    </div>

    <v-data-table
      v-if="jobs.length > 0"
      v-model="selected"
      :headers="headers"
      :items="jobs"
      item-value="id"
      show-select
      :items-per-page="pageSize"
      hide-default-footer
    >

      <template #[`item.user_id`]="{ item }">
        <JobActor :job="item" />
      </template>


      <template #[`item.status`]="{ item }">
        <v-chip :color="statusColor(item.status)" size="small">
          {{ item.status }}<template v-if="item.status === 'retrying'">&nbsp;{{ item.attempt }}/{{ item.max_attempts }}</template>
        </v-chip>
      </template>

      <template #[`item.created_at`]="{ item }">
        <span class="text-no-wrap">{{ formatShortDateTime(item.created_at) }}</span>
      </template>

      <template #[`item.actions`]="{ item }">
        <div class="d-flex justify-end">
          <v-btn icon="mdi-eye" size="small" variant="text" :aria-label="`View job ${item.id}`" title="View" @click="selectJob(item.id)" />
          <v-btn
            v-if="canRetry(item.status)"
            icon="mdi-replay"
            size="small"
            variant="text"
            color="primary"
            title="Retry"
            :aria-label="`Retry job ${item.id}`"
            :loading="isRetrying && actingJobId === item.id"
            :disabled="isMutating"
            @click="retryJob(item.id)"
          />
          <v-btn
            v-if="canCancel(item.status)"
            icon="mdi-cancel"
            size="small"
            variant="text"
            color="error"
            title="Cancel"
            :aria-label="`Cancel job ${item.id}`"
            :loading="isCancelling && actingJobId === item.id"
            :disabled="isMutating"
            @click="cancelJob(item.id)"
          />
        </div>
      </template>

      <template #bottom></template>
    </v-data-table>
    <p v-else-if="!isLoadingJobs" class="text-body-1">No jobs found.</p>

    <JobDetailDialog
      :job-id="selectedJobId"
      :busy="isMutating"
      :chain-cancelling="isMassCancelling"
      @close="selectedJobId = null"
      @show-chain="showChain"
      @cancel-chain="cancelChain"
      @retry="retryJob"
      @cancel="cancelJob"
    />
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { AdminPageTitle, AdminToolbar, ContentWidth, ShortId } from "@saflib/vue/components";
import { UserPicker } from "@saflib/ory-kratos-vue";
import JobActor from "./JobActor.vue";
import JobDetailDialog from "./JobDetailDialog.vue";
import { canCancel, canRetry, statusColor } from "./job-format.ts";
import { formatShortDateTime } from "@saflib/vue";
import type { Job } from "@saflib/jobs-spec";
import {
  useRetryJob,
  useCancelJob,
  useCancelJobsByOriginalRequest,
} from "../requests/queries";
import { useJobsPageLoader } from "./Jobs.loader.ts";
import { jobs as strings } from "./Jobs.strings.ts";

const {
  pageSize,
  offset,
  statusFilter,
  operationIdFilter,
  userIdFilter,
  originalRequestIdFilter,
  jobsQuery,
} = useJobsPageLoader();

// ?job=<id> opens that job (links from other pages' job ids).
const routeJob = useRoute()?.query.job;
const selectedJobId = ref<string | null>(typeof routeJob === "string" ? routeJob : null);
const actingJobId = ref<string | null>(null);

const statusOptions: Job["status"][] = [
  "pending",
  "running",
  "retrying",
  "succeeded",
  "dead",
  "cancelled",
];

// Job id, request and attempts are in the job dialog (View).
const wide = { headerProps: { class: "saf-admin-hide-xs" }, cellProps: { class: "saf-admin-hide-xs" } };
const headers = [
  { title: "Status", key: "status", sortable: true },
  { title: "Operation", key: "operation_id", sortable: true },
  { title: "Started by", key: "user_id", sortable: true, ...wide },
  { title: "Created", key: "created_at", sortable: true, ...wide },
  { title: "", key: "actions", sortable: false, align: "end" as const },
];

const isLoadingJobs = computed(() => jobsQuery.isLoading.value);
const jobs = computed(() => jobsQuery.data.value?.jobs ?? []);
const hasNextPage = computed(() => jobs.value.length >= pageSize);

const {
  mutate: retryMutate,
  isPending: isRetrying,
  error: retryError,
} = useRetryJob();

const {
  mutate: cancelMutate,
  isPending: isCancelling,
  error: cancelError,
} = useCancelJob();

const {
  mutate: massCancelMutate,
  isPending: isMassCancelling,
  error: massCancelError,
} = useCancelJobsByOriginalRequest();

const isMutating = computed(
  () => isRetrying.value || isCancelling.value || isMassCancelling.value,
);

const mutationError = computed(
  () => retryError.value || cancelError.value || massCancelError.value,
);

const activeFilterCount = computed(
  () => (statusFilter.value ? 1 : 0) + (userIdFilter.value ? 1 : 0),
);

// Bulk actions on the checked rows: each eligible job, one at a time.
const selected = ref<string[]>([]);
const selectedJobs = computed(() => jobs.value.filter((j) => selected.value.includes(j.id)));
const retryable = computed(() => selectedJobs.value.filter((j) => canRetry(j.status)));
const cancellable = computed(() => selectedJobs.value.filter((j) => canCancel(j.status)));
const bulkAction = ref<"retry" | "cancel" | null>(null);
const { mutateAsync: retryAsync } = useRetryJob();
const { mutateAsync: cancelAsync } = useCancelJob();
async function bulk(action: "retry" | "cancel") {
  bulkAction.value = action;
  try {
    for (const j of action === "retry" ? retryable.value : cancellable.value) {
      await (action === "retry" ? retryAsync(j.id) : cancelAsync(j.id));
    }
    selected.value = [];
  } finally {
    bulkAction.value = null;
  }
}

const selectJob = (id: string) => {
  selectedJobId.value = id;
};

const retryJob = (id: string) => {
  actingJobId.value = id;
  retryMutate(id, {
    onSettled: () => {
      actingJobId.value = null;
    },
  });
};

const cancelJob = (id: string) => {
  actingJobId.value = id;
  cancelMutate(id, {
    onSettled: () => {
      actingJobId.value = null;
    },
  });
};

// From the job dialog: list every job from that request.
const showChain = (originalRequestId: string) => {
  originalRequestIdFilter.value = originalRequestId;
  selectedJobId.value = null;
};

const cancelChain = (originalRequestId: string) => {
  massCancelMutate({ original_request_id: originalRequestId });
};

const prevPage = () => {
  offset.value = Math.max(0, offset.value - pageSize);
};

const nextPage = () => {
  if (hasNextPage.value) {
    offset.value += pageSize;
  }
};
</script>

