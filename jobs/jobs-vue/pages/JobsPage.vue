<template>
  <ContentWidth variant="full">
    <AdminPageTitle class="mb-4">{{ strings.title }}</AdminPageTitle>

    <v-row class="mb-4" density="comfortable">
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          clearable
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          v-model="operationIdFilter"
          label="Operation"
          clearable
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          v-model="userIdFilter"
          label="User"
          clearable
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          v-model="originalRequestIdFilter"
          label="Original Request Id"
          clearable
          density="compact"
          hide-details
        />
      </v-col>
    </v-row>

    <v-row class="mb-4" density="comfortable" align="center">
      <v-col cols="auto">
        <v-btn
          size="small"
          variant="outlined"
          color="error"
          :disabled="!originalRequestIdFilter"
          :loading="isMassCancelling"
          @click="massCancelChain"
        >
          Mass Cancel Chain
        </v-btn>
      </v-col>
      <v-col cols="auto">
        <v-btn size="small" variant="text" :disabled="offset === 0" @click="prevPage">
          Previous
        </v-btn>
        <v-btn
          size="small"
          variant="text"
          :disabled="!hasNextPage"
          @click="nextPage"
        >
          Next
        </v-btn>
      </v-col>
    </v-row>

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
      <template #[`item.id`]="{ item }">
        <ShortId :id="item.id" prefix="j" />
      </template>

      <template #[`item.user_id`]="{ item }">
        <JobActor :job="item" />
      </template>

      <template #[`item.original_request_id`]="{ item }">
        <ShortId :id="item.original_request_id" prefix="r" />
      </template>

      <template #[`item.status`]="{ item }">
        <v-chip :color="statusColor(item.status)" size="small">
          {{ item.status }}
        </v-chip>
      </template>

      <template #[`item.created_at`]="{ item }">
        <span class="text-no-wrap">{{ formatDateTime(item.created_at) }}</span>
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
      @close="selectedJobId = null"
      @retry="retryJob"
      @cancel="cancelJob"
    />
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { AdminPageTitle, ContentWidth, ShortId } from "@saflib/vue/components";
import JobActor from "./JobActor.vue";
import JobDetailDialog from "./JobDetailDialog.vue";
import { canCancel, canRetry, formatDateTime, statusColor } from "./job-format.ts";
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

const selectedJobId = ref<string | null>(null);
const actingJobId = ref<string | null>(null);

const statusOptions: Job["status"][] = [
  "pending",
  "running",
  "retrying",
  "succeeded",
  "dead",
  "cancelled",
];

const headers = [
  { title: "Job", key: "id", sortable: true },
  { title: "Status", key: "status", sortable: true },
  { title: "Operation", key: "operation_id", sortable: true },
  { title: "Started by", key: "user_id", sortable: true },
  { title: "Request", key: "original_request_id", sortable: true },
  { title: "Attempt", key: "attempt", sortable: true },
  { title: "Created", key: "created_at", sortable: true },
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

const massCancelChain = () => {
  if (!originalRequestIdFilter.value) return;
  massCancelMutate({ original_request_id: originalRequestIdFilter.value });
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

