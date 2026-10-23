<template>
  <div class="scan-commit-panel">
    <template v-if="status">
      <p class="scan-commit-panel__title">Scanning this commit</p>
      <p class="scan-commit-panel__body">{{ status.step }}</p>
      <v-progress-linear
        class="scan-commit-panel__bar scan-progress-bar"
        color="primary"
        height="6"
        rounded
        :model-value="status.percent"
        :indeterminate="status.indeterminate"
        aria-label="Scan progress"
      />
    </template>
    <template v-else>
      <p class="scan-commit-panel__title">This commit hasn’t been scanned yet</p>
      <p class="scan-commit-panel__body">
        Scan builds the package inventory so you can browse specs, docs, and
        issues for this checkout.
      </p>
      <v-btn color="primary" size="large" variant="flat" @click="emit('scan')">
        Scan this commit
      </v-btn>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import { isActiveScanJob, useScanJobs } from "../requests/scan-jobs";
import {
  describeScanStatus,
  inlineScanCommits,
  type ScanStatus,
} from "../scan-status";

/**
 * Empty state for an unscanned commit. While a scan of that commit is queued
 * or running (from here or anywhere else), shows its step and progress in
 * place of the prompt; the app bar leaves that job to this panel.
 */
const props = defineProps<{
  subdomain: string;
  commitHash: string;
  /** The page has asked for a scan that the job list doesn't show yet. */
  requested?: boolean;
}>();

const emit = defineEmits<{ scan: [] }>();

const { data } = useScanJobs(props.subdomain);

const job = computed(() =>
  (data.value?.scan_jobs ?? []).find(
    (j) => j.commit_hash === props.commitHash && isActiveScanJob(j),
  ),
);

const status = computed<ScanStatus | null>(() => {
  if (job.value) return describeScanStatus([job.value]);
  if (props.requested) {
    return { label: "", step: "Starting", percent: 0, indeterminate: true };
  }
  return null;
});

watch(
  () => props.commitHash,
  (hash, previous) => {
    if (previous) inlineScanCommits.delete(previous);
    inlineScanCommits.add(hash);
  },
  { immediate: true },
);
onBeforeUnmount(() => inlineScanCommits.delete(props.commitHash));
</script>

<style scoped>
.scan-commit-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1.5rem;
  text-align: center;
}
.scan-commit-panel__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}
.scan-commit-panel__body {
  margin: 0 0 0.5rem;
  max-width: 28rem;
  font-size: 0.9rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
/* Progress arrives every poll (~500ms); ease between values instead of jumping. */
.scan-progress-bar :deep(.v-progress-linear__determinate) {
  transition: width 0.6s ease-out;
}
.scan-commit-panel__bar {
  width: 100%;
  max-width: 24rem;
  flex: 0 0 auto;
}
</style>
