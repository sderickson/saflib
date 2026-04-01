<template>
  <div>
    <VerificationIntro :flow-return-to="flow.return_to" />
    <div class="d-flex flex-column flex-sm-row align-sm-center ga-2 mb-4">
      <span class="text-body-2 text-medium-emphasis">{{
        t(strings.resend_help)
      }}</span>
      <v-btn
        variant="tonal"
        size="small"
        tag="a"
        :href="newVerificationHref"
        :disabled="submitting"
        :aria-label="t(strings.cta_resend_code)"
      >
        {{ t(strings.cta_resend_code) }}
      </v-btn>
    </div>

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
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import KratosFlowUi from "../common/KratosFlowUi.vue";
import VerificationIntro from "./VerificationIntro.vue";
import { kratos_verification_flow as strings } from "./VerificationFlowForm.strings.ts";
import { useVerificationFlow } from "./useVerificationFlow.ts";
import { useNewVerificationEntryHref } from "./useNewVerificationEntryHref.ts";
import type { VerificationFlow } from "@ory/client";

const props = defineProps<{
  flow: VerificationFlow;
}>();

const { t } = useReverseT();
const route = useRoute();

const verificationToken = computed(() =>
  typeof route.query.token === "string" ? route.query.token : undefined,
);

const newVerificationHref = useNewVerificationEntryHref(
  () => props.flow.return_to,
);

const {
  submitting,
  submitError,
  clearSubmitError,
  submitVerificationForm,
  verificationMessageFilter,
} = useVerificationFlow(verificationToken, () => props.flow.id);
</script>
