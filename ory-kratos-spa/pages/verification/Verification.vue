<template>
  <v-container class="py-8" max-width="720">
    <VerificationFlowForm
      v-if="queryData instanceof VerificationFlowFetched && flow"
      :flow="flow"
    />
    <FlowGonePanel
      v-else-if="queryData instanceof FlowGone"
      restart-path="/new-verification"
      :result="queryData"
    />
    <CsrfViolationPanel
      v-else-if="queryData instanceof SecurityCsrfViolation"
      restart-path="/new-verification"
      :result="queryData"
    />
    <UnhandledResponsePanel v-else :result="queryData" />
  </v-container>
</template>

<script setup lang="ts">
import {
  FlowGone,
  SecurityCsrfViolation,
  VerificationFlowFetched,
} from "@saflib/ory-kratos-sdk";
import { useVerificationLoader } from "./Verification.loader.ts";
import CsrfViolationPanel from "../common/CsrfViolationPanel.vue";
import FlowGonePanel from "../common/FlowGonePanel.vue";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import VerificationFlowForm from "./VerificationFlowForm.vue";
import { computed, toValue } from "vue";

const { getVerificationFlowQuery } = useVerificationLoader();

const queryData = computed(() => toValue(getVerificationFlowQuery.data));

const flow = computed(() => {
  const d = queryData.value;
  if (d instanceof VerificationFlowFetched) {
    return d.flow;
  }
  return null;
});
</script>
