<template>
  <div>
    <VerificationIntro :flow-return-to="flowReturnTo" />

    <p v-if="email" class="text-body-2 text-medium-emphasis mb-4">
      {{ t(strings.instructions) }}
    </p>
    <p v-else class="text-body-2 text-medium-emphasis mb-4">
      {{ t(strings.instructions_no_email) }}
    </p>

    <v-alert
      v-if="bootstrapping"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
      :text="t(strings.preparing)"
    />

    <v-alert
      v-if="submitError"
      type="error"
      density="compact"
      variant="tonal"
      class="mb-4"
      :text="submitError"
    />

    <v-alert
      v-if="resendInfo"
      type="success"
      density="compact"
      variant="tonal"
      class="mb-4"
      :text="resendInfo"
    />

    <v-text-field
      v-model="code"
      :label="t(strings.code_label)"
      :disabled="isPending || bootstrapping || !activeFlow"
      autocomplete="one-time-code"
      class="mb-4"
      hide-details="auto"
      @keyup.enter="submitCode"
    />

    <div class="d-flex flex-wrap ga-2">
      <v-btn
        variant="text"
        :disabled="isPending || bootstrapping || !email"
        :loading="isPending"
        @click="resendCode"
      >
        {{ t(flowStrings.cta_resend_code) }}
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        :disabled="!canSubmit || bootstrapping || !activeFlow"
        :loading="isPending"
        @click="submitCode"
      >
        {{ t(strings.submit) }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import type { Session, VerificationFlow } from "@ory/client";
import { useKratosSession } from "@saflib/ory-kratos-sdk";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import VerificationIntro from "./VerificationIntro.vue";
import { verification_code_entry as strings } from "./VerificationCodeEntry.strings.ts";
import { kratos_verification_flow as flowStrings } from "./VerificationFlowForm.strings.ts";
import { useVerificationStubFlow } from "./useVerificationStubFlow.ts";

const props = defineProps<{
  flow: VerificationFlow;
  /** Registration already sent a code — skip the email bootstrap step. */
  skipEmailBootstrap?: boolean;
}>();

const { t } = useReverseT();
const sessionQuery = useKratosSession();
const sessionRef = computed(() => sessionQuery.data.value as Session | null | undefined);
const flowRef = computed(() => props.flow);
const needsEmailBootstrap = ref(!props.skipEmailBootstrap);

const flowReturnTo = computed(() => props.flow.return_to);

const {
  code,
  email,
  submitError,
  resendInfo,
  canSubmit,
  isPending,
  bootstrapping,
  activeFlow,
  submitCode,
  resendCode,
} = useVerificationStubFlow({
  flow: flowRef,
  session: sessionRef,
  needsEmailBootstrap: toRef(needsEmailBootstrap),
});
</script>
