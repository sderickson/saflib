<template>
  <div class="d-flex justify-center py-4">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from "vue";
import { useRouter } from "vue-router";
import type { RecoveryFlowCreated } from "@saflib/ory-kratos-sdk";

const props = defineProps<{
  result: RecoveryFlowCreated;
}>();

const router = useRouter();

watchEffect(() => {
  const id = props.result.flow.id;
  if (!id) return;
  void router.push({
    path: "/recovery",
    query: { flow: id },
  });
});
</script>
