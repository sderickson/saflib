<template>
  <div>
    <RecoveryIntro :flow-return-to="flow.return_to" />
    <div class="d-flex flex-column flex-sm-row align-sm-center ga-2 mb-4">
      <span class="text-body-2 text-medium-emphasis">{{
        t(strings.resend_help)
      }}</span>
      <v-btn
        variant="tonal"
        size="small"
        tag="a"
        :href="newRecoveryHref"
        :disabled="submitting"
        :aria-label="t(strings.cta_new_flow)"
      >
        {{ t(strings.cta_new_flow) }}
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
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import KratosFlowUi from "../common/KratosFlowUi.vue";
import RecoveryIntro from "./RecoveryIntro.vue";
import { kratos_recovery_flow as strings } from "./RecoveryFlowForm.strings.ts";
import { useRecoveryFlow } from "./useRecoveryFlow.ts";
import { useNewRecoveryEntryHref } from "./useNewRecoveryEntryHref.ts";

const props = defineProps<{
  flow: RecoveryFlow;
}>();

const { t } = useReverseT();
const route = useRoute();

const recoveryToken = computed(() =>
  typeof route.query.token === "string" ? route.query.token : undefined,
);

const newRecoveryHref = useNewRecoveryEntryHref(() => props.flow.return_to);

const { submitting, submitError, clearSubmitError, submitRecoveryForm } =
  useRecoveryFlow(recoveryToken, () => props.flow.id);
</script>
