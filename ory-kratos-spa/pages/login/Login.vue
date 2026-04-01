<template>
  <v-container class="py-8" max-width="720">
    <LoginFlowForm
      v-if="queryData instanceof LoginFlowFetched && flow"
      :flow="flow"
    />
    <FlowGonePanel
      v-else-if="queryData instanceof FlowGone"
      restart-path="/new-login"
      :result="queryData"
    />
    <CsrfViolationPanel
      v-else-if="queryData instanceof SecurityCsrfViolation"
      restart-path="/new-login"
      :result="queryData"
    />
    <UnhandledResponsePanel v-else :result="queryData" />
  </v-container>
</template>

<script setup lang="ts">
import { FlowGone, LoginFlowFetched, SecurityCsrfViolation } from "@saflib/ory-kratos-sdk";
import { useLoginLoader } from "./Login.loader.ts";
import CsrfViolationPanel from "../common/CsrfViolationPanel.vue";
import FlowGonePanel from "../common/FlowGonePanel.vue";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import LoginFlowForm from "./LoginFlowForm.vue";
import { computed, toValue } from "vue";

const { getLoginFlowQuery } = useLoginLoader();

const queryData = computed(() => toValue(getLoginFlowQuery.data));

const flow = computed(() => {
  const d = queryData.value;
  if (d instanceof LoginFlowFetched) {
    return d.flow;
  }
  return null;
});
</script>
