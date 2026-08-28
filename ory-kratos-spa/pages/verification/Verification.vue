<template>
  <VerificationFlowForm
    v-if="effectiveFlow && showKratosForm"
    :flow="effectiveFlow"
  />
  <VerificationCodeEntry
    v-else-if="effectiveFlow && showCodeEntry"
    :flow="effectiveFlow"
    :skip-email-bootstrap="skipEmailBootstrap"
  />
  <FlowGonePanel
    v-else-if="queryData instanceof FlowGone"
    restart-path="/new-verification"
    :result="queryData"
  />
  <CsrfViolationPanel
    v-else-if="queryData instanceof SecurityCsrfViolation && !flowId"
    restart-path="/new-verification"
    :result="queryData"
  />
  <UnhandledResponsePanel v-else :result="queryData" />
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
import VerificationCodeEntry from "./VerificationCodeEntry.vue";
import {
  parseVerificationFlowIdFromQuery,
  stubVerificationFlow,
  verificationFlowHasUiNodes,
} from "./Verification.logic.ts";
import { computed, toValue } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const { getVerificationFlowQuery } = useVerificationLoader();

const flowId = computed(() => parseVerificationFlowIdFromQuery(route.query));

const queryData = computed(() => toValue(getVerificationFlowQuery.data));

const fetchedFlow = computed(() => {
  const d = queryData.value;
  if (d instanceof VerificationFlowFetched) {
    return d.flow;
  }
  return null;
});

/** Registration-created flows 403 on GET; UPDATE with the id still works. */
const stubFromCsrf = computed(
  () =>
    queryData.value instanceof SecurityCsrfViolation && !!flowId.value,
);

const effectiveFlow = computed(() => {
  if (fetchedFlow.value) {
    return fetchedFlow.value;
  }
  if (stubFromCsrf.value && flowId.value) {
    return stubVerificationFlow(flowId.value);
  }
  return null;
});

const showKratosForm = computed(() => {
  const flow = effectiveFlow.value;
  return !!flow && verificationFlowHasUiNodes(flow);
});

const showCodeEntry = computed(() => {
  const flow = effectiveFlow.value;
  return !!flow && !verificationFlowHasUiNodes(flow);
});

/** Registration already emailed a code before handing off the flow id. */
const skipEmailBootstrap = computed(() => stubFromCsrf.value);
</script>
