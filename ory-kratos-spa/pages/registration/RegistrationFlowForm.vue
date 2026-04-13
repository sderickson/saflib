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
      :nodes="registrationDisplayNodes"
      :submitting="submitting"
      id-prefix="kratos-login"
      :message-filter="registrationMessageFilter"
      @submit="submitRegistrationForm"
    />
    <div class="text-center mb-4 mt-8">
      {{ t(strings.already_registered) }}
      <a
        :href="loginHref"
        class="text-primary text-decoration-none d-inline-flex align-center ga-1"
      >
        {{ t(strings.link_login) }}
        <v-icon icon="mdi-chevron-right" size="small" />
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue";
import KratosFlowUi from "../common/KratosFlowUi.vue";
import RegistrationIntro from "./RegistrationIntro.vue";
import { sortRegistrationFlowNodes } from "./kratosRegistrationNodeOrder.logic.ts";
import { useRegistrationFlow } from "./useRegistrationFlow.ts";
import type { RegistrationFlow } from "@ory/client";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { kratos_registration_flow as strings } from "./RegistrationFlowForm.strings.ts";

const { t } = useReverseT();

import { useAuthFlowCrossLinks } from "../common/useAuthFlowCrossLinks.ts";
const props = defineProps<{ flow: RegistrationFlow }>();

const registrationDisplayNodes = computed(() =>
  sortRegistrationFlowNodes(props.flow.ui.nodes),
);

const { loginHref } = useAuthFlowCrossLinks();

const {
  submitting,
  submitError,
  clearSubmitError,
  submitRegistrationForm,
  registrationMessageFilter,
} = useRegistrationFlow(toRef(props, "flow"));
</script>
