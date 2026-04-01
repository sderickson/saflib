<template>
  <v-container class="py-8" max-width="720">
    <RecoveryFlowCreatedView
      v-if="queryData instanceof RecoveryFlowCreatedResult"
      :result="queryData"
    />
    <SessionAlreadyAvailableComponent
      v-else-if="queryData instanceof SessionAlreadyAvailable"
    />
    <UnhandledResponsePanel v-else :result="queryData" />
  </v-container>
</template>

<script setup lang="ts">
import {
  RecoveryFlowCreated as RecoveryFlowCreatedResult,
  SessionAlreadyAvailable,
} from "@saflib/ory-kratos-sdk";
import { useNewRecoveryLoader } from "./NewRecovery.loader.ts";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import RecoveryFlowCreatedView from "./RecoveryFlowCreated.vue";
import SessionAlreadyAvailableComponent from "../common/SessionAlreadyAvailable.vue";
import { computed, toValue } from "vue";

const { createRecoveryFlowQuery } = useNewRecoveryLoader();

const queryData = computed(() => toValue(createRecoveryFlowQuery.data));
</script>
