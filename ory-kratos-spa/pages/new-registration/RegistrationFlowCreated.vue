<template>
  <div class="d-flex justify-center py-4">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from "vue";
import { useRouter } from "vue-router";
import type { RegistrationFlowCreated } from "@saflib/ory-kratos-sdk";

const props = defineProps<{
  result: RegistrationFlowCreated;
}>();

const router = useRouter();

watchEffect(() => {
  const id = props.result.flow.id;
  if (!id) return;
  router.push({
    path: "/registration",
    query: { flow: id },
  });
});
</script>
