<template>
  <template v-if="status">
    <span class="scan-status text-caption" :title="status.label">
      {{ status.label }}
    </span>
    <v-progress-linear
      absolute
      location="bottom"
      color="primary"
      height="3"
      :model-value="status.percent"
      :indeterminate="status.indeterminate"
      aria-label="Scan progress"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useScanJobs } from "../requests/scan-jobs";
import { describeScanStatus, inlineScanCommits } from "../scan-status";

const props = withDefaults(defineProps<{ subdomain?: string }>(), {
  subdomain: "",
});

const { data } = useScanJobs(props.subdomain);
// Jobs whose progress a page already shows inline are left out here.
const status = computed(() =>
  describeScanStatus(
    (data.value?.scan_jobs ?? []).filter(
      (job) => !job.commit_hash || !inlineScanCommits.has(job.commit_hash),
    ),
  ),
);
</script>

<style scoped>
.scan-status {
  max-width: 40vw;
  margin-right: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.8;
}
</style>
