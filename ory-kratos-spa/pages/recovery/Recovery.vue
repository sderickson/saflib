<template>
  <v-container class="py-8" max-width="720">
    <RecoveryFlowForm
      v-if="queryData instanceof RecoveryFlowFetched && flow"
      :flow="flow"
    />
    <FlowGonePanel
      v-else-if="queryData instanceof FlowGone"
      restart-path="/new-recovery"
      :result="queryData"
    />
    <CsrfViolationPanel
      v-else-if="queryData instanceof SecurityCsrfViolation"
      restart-path="/new-recovery"
      :result="queryData"
    />
    <UnhandledResponsePanel v-else :result="queryData" />
  </v-container>
</template>

<script setup lang="ts">
import {
  FlowGone,
  RecoveryFlowFetched,
  SecurityCsrfViolation,
} from "@saflib/ory-kratos-sdk";
import { useRecoveryLoader } from "./Recovery.loader.ts";
import CsrfViolationPanel from "../common/CsrfViolationPanel.vue";
import FlowGonePanel from "../common/FlowGonePanel.vue";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import RecoveryFlowForm from "./RecoveryFlowForm.vue";
import { computed, toValue } from "vue";

const { getRecoveryFlowQuery } = useRecoveryLoader();

const queryData = computed(() => toValue(getRecoveryFlowQuery.data));

const flow = computed(() => {
  const d = queryData.value;
  if (d instanceof RecoveryFlowFetched) {
    return d.flow;
  }
  return null;
});
</script>
