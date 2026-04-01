<template>
  <div>
    <RegistrationIntro :flow-return-to="flow.return_to" />
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
      id-prefix="kratos-login"
      :message-filter="registrationMessageFilter"
      @submit="submitRegistrationForm"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import KratosFlowUi from "../common/KratosFlowUi.vue";
import RegistrationIntro from "./RegistrationIntro.vue";
import { useRegistrationFlow } from "./useRegistrationFlow.ts";
import type { RegistrationFlow } from "@ory/client";

const props = defineProps<{ flow: RegistrationFlow }>();

const {
  submitting,
  submitError,
  clearSubmitError,
  submitRegistrationForm,
  registrationMessageFilter,
} = useRegistrationFlow(toRef(props, "flow"));
</script>
