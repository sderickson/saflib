<template>
  <div>
    <RegistrationIntro />
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
    >
      <template
        v-if="hasFieldsetOverride"
        #fieldset="{ displayNodes, allNodeIndices }"
      >
        <slot name="before-fields" :submitting="submitting" />
        <template v-for="idx in allNodeIndices" :key="'node-' + idx">
          <slot
            v-if="
              isFirstSubmitIndex(displayNodes, idx, allNodeIndices) &&
              hasPasswordNode(displayNodes)
            "
            name="before-submit"
            :submitting="submitting"
          />
          <KratosFlowUiNodeAt :idx="idx" />
        </template>
      </template>
    </KratosFlowUi>
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
import { computed, toRef, useSlots } from "vue";
import type { UiNode } from "@ory/client";
import KratosFlowUi from "../common/KratosFlowUi.vue";
import KratosFlowUiNodeAt from "../common/KratosFlowUiNodeAt.vue";
import { isKratosInputNode } from "../common/kratosNodeUtils.ts";
import RegistrationIntro from "./RegistrationIntro.vue";
import { sortRegistrationFlowNodes } from "./kratosRegistrationNodeOrder.logic.ts";
import {
  useRegistrationFlow,
  type UseRegistrationFlowOptions,
} from "./useRegistrationFlow.ts";
import type { RegistrationFlow } from "@ory/client";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { kratos_registration_flow as strings } from "./RegistrationFlowForm.strings.ts";

const { t } = useReverseT();

import { useAuthFlowCrossLinks } from "../common/useAuthFlowCrossLinks.ts";

const props = defineProps<{
  flow: RegistrationFlow;
  beforeSubmit?: UseRegistrationFlowOptions["beforeSubmit"];
  afterRegistration?: UseRegistrationFlowOptions["afterRegistration"];
}>();

defineSlots<{
  "before-fields"(props: { submitting: boolean }): unknown;
  "before-submit"(props: { submitting: boolean }): unknown;
}>();

const slots = useSlots();
const hasFieldsetOverride = computed(
  () => !!slots["before-fields"] || !!slots["before-submit"],
);

function isSubmitNode(node: UiNode | undefined): boolean {
  return (
    !!node &&
    isKratosInputNode(node) &&
    node.attributes.type === "submit"
  );
}

function hasPasswordNode(displayNodes: readonly UiNode[]): boolean {
  return displayNodes.some(
    (node) =>
      isKratosInputNode(node) &&
      (node.attributes.name === "password" ||
        node.attributes.type === "password"),
  );
}

/** True for the first submit button index so `before-submit` renders once. */
function isFirstSubmitIndex(
  displayNodes: readonly UiNode[],
  idx: number,
  allNodeIndices: readonly number[],
): boolean {
  if (!isSubmitNode(displayNodes[idx])) return false;
  return !allNodeIndices.some(
    (other) => other < idx && isSubmitNode(displayNodes[other]),
  );
}

const registrationDisplayNodes = computed(() =>
  sortRegistrationFlowNodes(props.flow.ui.nodes),
);

const { loginHref } = useAuthFlowCrossLinks(() => props.flow.return_to);

const flowOptions = computed<UseRegistrationFlowOptions>(() => ({
  beforeSubmit: props.beforeSubmit,
  afterRegistration: props.afterRegistration,
}));

const {
  submitting,
  submitError,
  clearSubmitError,
  submitRegistrationForm,
  registrationMessageFilter,
} = useRegistrationFlow(toRef(props, "flow"), flowOptions);
</script>
