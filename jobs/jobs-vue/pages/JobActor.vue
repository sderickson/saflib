<template>
  <!-- A cron tick runs under the admin who enabled the job; show the cron job
       as the actor and that admin on hover. -->
  <ActorChip
    v-if="authority.kind === 'cron'"
    kind="cron"
    :label="authority.cron_job_name"
    :title="`Enabled by ${authority.user_id}`"
  />
  <UserRef v-else :id="job.user_id" variant="compact" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Job } from "@saflib/jobs-spec";
import { ActorChip, UserRef } from "@saflib/ory-kratos-vue";

const props = defineProps<{ job: Job }>();
const authority = computed(() => props.job.authority);
</script>
