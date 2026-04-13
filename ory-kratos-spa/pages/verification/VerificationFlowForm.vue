<template>
  <div>
    <VerificationIntro :flow-return-to="flow.return_to" />

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
      id-prefix="kratos-verify"
      :hide-submit-names="['email']"
      :message-filter="verificationMessageFilter"
      @submit="(form) => submitVerificationForm(form)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import KratosFlowUi from "../common/KratosFlowUi.vue";
import VerificationIntro from "./VerificationIntro.vue";
import { useVerificationFlow } from "./useVerificationFlow.ts";
import type { VerificationFlow } from "@ory/client";

const props = defineProps<{
  flow: VerificationFlow;
}>();

const route = useRoute();

const verificationToken = computed(() =>
  typeof route.query.token === "string" ? route.query.token : undefined,
);

const {
  submitting,
  submitError,
  clearSubmitError,
  submitVerificationForm,
  verificationMessageFilter,
} = useVerificationFlow(verificationToken, () => props.flow.id);
</script>
