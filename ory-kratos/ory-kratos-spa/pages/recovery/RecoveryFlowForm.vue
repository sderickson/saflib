<template>
  <div>
    <RecoveryIntro :flow-return-to="flow.return_to" />

    <v-alert
      v-if="submitError"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="clearSubmitError"
    >
      {{ submitError }}
    </v-alert>

    <KratosFlowUi
      v-if="flow"
      :flow="flow"
      :submitting="submitting"
      id-prefix="kratos-recovery"
      :hide-submit-names="['email']"
      @submit="(form, submitter) => submitRecoveryForm(form, submitter)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { RecoveryFlow } from "@ory/client";
import KratosFlowUi from "../common/KratosFlowUi.vue";
import RecoveryIntro from "./RecoveryIntro.vue";
import { useRecoveryFlow } from "./useRecoveryFlow.ts";

const props = defineProps<{
  flow: RecoveryFlow;
}>();

const route = useRoute();

const recoveryToken = computed(() =>
  typeof route.query.token === "string" ? route.query.token : undefined,
);

const { submitting, submitError, clearSubmitError, submitRecoveryForm } =
  useRecoveryFlow(recoveryToken, () => props.flow.id);
</script>
