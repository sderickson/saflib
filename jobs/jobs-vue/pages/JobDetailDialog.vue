<template>
  <v-dialog :model-value="!!jobId" max-width="760" scrollable @update:model-value="(open) => !open && emit('close')">
    <v-card data-test="job-detail">
      <div class="job-detail__head">
        <div class="d-flex align-center flex-wrap ga-2">
          <h2 class="job-detail__title">{{ job?.operation_id ?? "Job" }}</h2>
          <v-chip v-if="job" :color="statusColor(job.status)" size="small" variant="tonal">{{ job.status }}</v-chip>
          <ShortId v-if="jobId" :id="jobId" prefix="j" />
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="emit('close')" />
      </div>

      <v-card-text class="job-detail__body">
        <v-progress-linear v-if="query.isLoading.value" indeterminate class="mb-4" />
        <v-alert v-if="query.error.value" type="error" variant="tonal" class="mb-4">
          Error loading job: {{ query.error.value.message }}
        </v-alert>

        <template v-if="job">
          <dl class="job-detail__grid">
            <dt>Started by</dt>
            <dd><JobActor :job="job" /></dd>
            <dt>Authority</dt>
            <dd data-test="job-authority">
              <template v-if="job.authority.kind === 'cron'">
                Cron job <code>{{ job.authority.cron_job_name }}</code>, enabled by
                <UserRef :id="job.authority.user_id" variant="compact" />
              </template>
              <template v-else-if="job.authority.kind === 'resource'">
                {{ job.authority.resource_kind }} <ShortId :id="job.authority.resource_id" />, owned by
                <UserRef :id="job.authority.user_id" variant="compact" />
              </template>
              <template v-else>
                Request <ShortId :id="job.authority.request_id" prefix="r" /> by
                <UserRef :id="job.authority.user_id" variant="compact" />
              </template>
              <span v-if="assertionKey" class="text-medium-emphasis"> · signed ({{ assertionKey }})</span>
            </dd>
            <dt>Attempt</dt>
            <dd>{{ job.attempt }} of {{ job.max_attempts }}</dd>
            <dt>Created</dt>
            <dd>{{ formatDateTime(job.created_at) }}</dd>
            <dt>Run at</dt>
            <dd>{{ formatDateTime(job.run_at) }}</dd>
            <dt>Started</dt>
            <dd>{{ formatDateTime(job.started_at) }}</dd>
            <dt>Finished</dt>
            <dd>{{ formatDateTime(job.finished_at) }}</dd>
            <dt>Chain</dt>
            <dd>
              <ShortId :id="job.original_request_id" prefix="r" />
              <template v-if="job.parent_job_id"> · parent <ShortId :id="job.parent_job_id" prefix="j" /></template>
              <span class="text-medium-emphasis"> · enqueued by <code>{{ job.enqueued_by_operation_id }}</code></span>
              <div v-if="chainPending > 0" class="mt-1">
                <v-btn
                  size="small"
                  variant="outlined"
                  color="error"
                  prepend-icon="mdi-cancel"
                  :loading="chainCancelling"
                  data-test="job-cancel-chain"
                  @click="emit('cancel-chain', job.original_request_id)"
                >
                  Cancel chain ({{ chainPending }} pending)
                  <v-tooltip activator="parent" location="top" max-width="320">
                    Cancels every pending or retrying job started by the same request, including ones
                    this job's children enqueued. Running jobs finish; nothing new from this chain will run.
                  </v-tooltip>
                </v-btn>
              </div>
            </dd>
            <template v-if="queueing.length">
              <dt>Queueing</dt>
              <dd>
                <template v-for="(q, i) in queueing" :key="q.label">
                  <span v-if="i > 0" class="text-medium-emphasis"> · </span>
                  {{ q.label }} <code>{{ q.value }}</code>
                </template>
              </dd>
            </template>
          </dl>

          <template v-if="job.result">
            <h3 class="job-detail__section">Result</h3>
            <dl class="job-detail__grid">
              <template v-if="job.result.status_code != null">
                <dt>Status code</dt>
                <dd><code>{{ job.result.status_code }}</code></dd>
              </template>
              <template v-if="job.result.terminal_reason">
                <dt>Ended because</dt>
                <dd>{{ humanize(job.result.terminal_reason) }}</dd>
              </template>
            </dl>
            <pre v-if="errorBody" class="job-detail__code" data-test="job-error-body">{{ errorBody }}</pre>
          </template>

          <template v-if="request.length">
            <h3 class="job-detail__section">Request</h3>
            <template v-for="part in request" :key="part.label">
              <div class="text-caption text-medium-emphasis mb-1">{{ part.label }}</div>
              <pre class="job-detail__code">{{ part.text }}</pre>
            </template>
          </template>
        </template>
      </v-card-text>

      <v-card-actions v-if="job && (canRetry(job.status) || canCancel(job.status))" class="job-detail__actions">
        <v-btn v-if="canCancel(job.status)" variant="outlined" color="error" :loading="busy" @click="emit('cancel', job.id)">
          Cancel job
        </v-btn>
        <v-btn v-if="canRetry(job.status)" color="primary" variant="flat" :loading="busy" @click="emit('retry', job.id)">
          Retry
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue";
import { ShortId } from "@saflib/vue/components";
import { UserRef } from "@saflib/ory-kratos-vue";
import JobActor from "./JobActor.vue";
import { useGetJob, useListJobs } from "../requests/queries";
import { canCancel, canRetry, formatDateTime, humanize, prettyBody, requestParts, statusColor } from "./job-format.ts";

const props = defineProps<{ jobId: string | null; busy?: boolean; chainCancelling?: boolean }>();
const emit = defineEmits<{ close: []; retry: [id: string]; cancel: [id: string]; "cancel-chain": [originalRequestId: string] }>();

const query = useGetJob(toRef(props, "jobId"));
const job = computed(() => query.data.value?.job);
// The signed assertion proves the job's authority to the endpoint; admins
// only need to know it's there and which key signed it.
const assertionKey = computed(() => query.data.value?.authority_assertion?.key_id);
const errorBody = computed(() => prettyBody(job.value?.result?.error_body));
// Other work from the same request that hasn't run yet: a runaway chain is
// stopped from here, where you'd notice it.
const chainId = computed(() => job.value?.original_request_id ?? "");
const chainQuery = useListJobs(computed(() => ({ original_request_id: chainId.value, limit: 200 })), {
  enabled: computed(() => !!chainId.value),
});
const chainPending = computed(
  () => (chainQuery.data.value?.jobs ?? []).filter((j) => j.status === "pending" || j.status === "retrying").length,
);

const queueing = computed(() => {
  const j = job.value;
  if (!j) return [];
  return [
    j.priority ? { label: "priority", value: String(j.priority) } : null,
    j.dedupe_key ? { label: "dedupe", value: j.dedupe_key } : null,
    j.concurrency_key ? { label: "concurrency", value: j.concurrency_key } : null,
  ].filter((q): q is { label: string; value: string } => q !== null);
});
const request = computed(() => (job.value ? requestParts(job.value.request) : []));
</script>

<style scoped>
.job-detail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.job-detail__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}
.job-detail__grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px 16px;
  margin: 0 0 8px;
  font-size: 0.875rem;
  align-items: center;
}
.job-detail__grid dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.job-detail__grid dd {
  margin: 0;
  min-width: 0;
}
.job-detail__section {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 20px 0 8px;
}
.job-detail__code {
  background: #f7f5ee;
  border: 1px solid #eaeaea;
  border-radius: 6px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.75rem;
  margin: 0 0 12px;
  max-height: 260px;
  overflow: auto;
  padding: 10px 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.job-detail__actions {
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
