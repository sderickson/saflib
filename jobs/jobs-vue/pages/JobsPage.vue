<template>
  <ContentWidth variant="full">
        <h1 class="text-h4 mb-4">Jobs</h1>

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
              color="warning"
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

        <v-alert v-if="jobsError" type="error" class="mb-4">
          Error loading jobs: {{ jobsError.message }}
        </v-alert>

        <v-alert v-if="mutationError" type="error" class="mb-4">
          Error updating job: {{ mutationError.message }}
        </v-alert>

        <v-data-table
          v-if="jobs && jobs.length > 0"
          :headers="headers"
          :items="jobs"
          item-value="id"
          class="elevation-1"
          :items-per-page="pageSize"
          hide-default-footer
        >
          <template #[`item.status`]="{ item }">
            <v-chip :color="statusColor(item.status)" size="small">
              {{ item.status }}
            </v-chip>
          </template>

          <template #[`item.createdAt`]="{ item }">
            {{ formatDateTime(item.createdAt) }}
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn size="small" variant="text" class="me-1" @click="selectJob(item.id)">
              View
            </v-btn>
            <v-btn
              v-if="canRetry(item.status)"
              size="small"
              class="me-1"
              :loading="isRetrying && actingJobId === item.id"
              :disabled="isMutating"
              @click="retryJob(item.id)"
            >
              Retry
            </v-btn>
            <v-btn
              v-if="canCancel(item.status)"
              size="small"
              color="warning"
              :loading="isCancelling && actingJobId === item.id"
              :disabled="isMutating"
              @click="cancelJob(item.id)"
            >
              Cancel
            </v-btn>
          </template>

          <template #bottom></template>
        </v-data-table>
        <p v-else-if="!isLoadingJobs && !jobsError" class="text-body-1">
          No jobs found.
        </p>

        <v-card v-if="selectedJobId" class="mt-6 elevation-1">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Job {{ selectedJobId }}</span>
            <v-btn size="small" variant="text" @click="selectedJobId = null">
              Close
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-progress-linear v-if="isLoadingDetail" indeterminate class="mb-4" />
            <v-alert v-if="detailError" type="error" class="mb-4">
              Error loading job: {{ detailError.message }}
            </v-alert>
            <template v-if="jobDetail">
              <h2 class="text-h6 mb-2">Status</h2>
              <v-chip :color="statusColor(jobDetail.job.status)" class="mb-4" size="small">
                {{ jobDetail.job.status }}
              </v-chip>

              <h2 class="text-h6 mb-2">Request</h2>
              <pre class="detail-block mb-4">{{ formatJson(jobDetail.job.request) }}</pre>

              <h2 class="text-h6 mb-2">Result</h2>
              <pre class="detail-block mb-4">{{ formatJson(jobDetail.job.result) }}</pre>

              <h2 class="text-h6 mb-2">Authority</h2>
              <pre class="detail-block mb-4">{{ formatJson(jobDetail.job.authority) }}</pre>

              <h2 class="text-h6 mb-2">Lineage</h2>
              <pre class="detail-block mb-4">{{
                formatJson({
                  originalRequestId: jobDetail.job.originalRequestId,
                  parentJobId: jobDetail.job.parentJobId,
                  enqueuedByOperationId: jobDetail.job.enqueuedByOperationId,
                })
              }}</pre>

              <h2 class="text-h6 mb-2">Authority Assertion</h2>
              <pre class="detail-block">{{
                formatJson(jobDetail.authorityAssertion)
              }}</pre>
            </template>
          </v-card-text>
        </v-card>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import type { Job } from "@saflib/jobs-spec";
import {
  useListJobs,
  useGetJob,
  useRetryJob,
  useCancelJob,
  useCancelJobsByOriginalRequest,
  type ListJobsQuery,
} from "../requests/queries";



const pageSize = 20;
const offset = ref(0);
const statusFilter = ref<Job["status"] | null>(null);
const operationIdFilter = ref("");
const userIdFilter = ref("");
const originalRequestIdFilter = ref("");
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

const listFilters = computed<ListJobsQuery>(() => {
  const filters: ListJobsQuery = {
    limit: pageSize,
    offset: offset.value,
  };
  if (statusFilter.value) filters.status = statusFilter.value;
  if (operationIdFilter.value) filters.operationId = operationIdFilter.value;
  if (userIdFilter.value) filters.userId = userIdFilter.value;
  if (originalRequestIdFilter.value) {
    filters.originalRequestId = originalRequestIdFilter.value;
  }
  return filters;
});

const headers = [
  { title: "Id", key: "id", sortable: true },
  { title: "Status", key: "status", sortable: true },
  { title: "Operation", key: "operationId", sortable: true },
  { title: "User", key: "userId", sortable: true },
  { title: "Original Request Id", key: "originalRequestId", sortable: true },
  { title: "Attempt", key: "attempt", sortable: true },
  { title: "Created At", key: "createdAt", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

const {
  data: listData,
  isLoading: isLoadingJobs,
  error: jobsError,
} = useListJobs(listFilters);

const jobs = computed(() => listData.value?.jobs ?? []);
const hasNextPage = computed(() => jobs.value.length >= pageSize);

const {
  data: jobDetail,
  isLoading: isLoadingDetail,
  error: detailError,
} = useGetJob(selectedJobId);

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
  massCancelMutate({ originalRequestId: originalRequestIdFilter.value });
};

const prevPage = () => {
  offset.value = Math.max(0, offset.value - pageSize);
};

const nextPage = () => {
  if (hasNextPage.value) {
    offset.value += pageSize;
  }
};

const canRetry = (status: Job["status"]) =>
  status === "dead" || status === "cancelled";

const canCancel = (status: Job["status"]) =>
  status === "pending" || status === "retrying";

const formatDateTime = (dateTimeString: string | null | undefined): string => {
  if (!dateTimeString) return "N/A";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateTimeString));
  } catch {
    return dateTimeString;
  }
};

const formatJson = (value: unknown): string => {
  if (value === null || value === undefined) return "N/A";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const statusColor = (status: Job["status"] | null | undefined): string => {
  switch (status) {
    case "succeeded":
      return "success";
    case "dead":
    case "cancelled":
      return "error";
    case "running":
      return "info";
    case "retrying":
      return "warning";
    case "pending":
      return "grey";
    default:
      return "grey";
  }
};
</script>

<style scoped>
.detail-block {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  font-size: 0.75rem;
  overflow-x: auto;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
