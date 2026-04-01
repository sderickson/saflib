<template>
  <v-container class="py-8" max-width="720">
    <VerificationFlowCreatedView
      v-if="queryData instanceof VerificationFlowCreatedResult"
      :result="queryData"
    />
    <UnhandledResponsePanel v-else :result="queryData" />
  </v-container>
</template>

<script setup lang="ts">
import { VerificationFlowCreated as VerificationFlowCreatedResult } from "@saflib/ory-kratos-sdk";
import { useNewVerificationLoader } from "./NewVerification.loader.ts";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import VerificationFlowCreatedView from "./VerificationFlowCreated.vue";
import { computed, toValue } from "vue";

const { createVerificationFlowQuery } = useNewVerificationLoader();

const queryData = computed(() => toValue(createVerificationFlowQuery.data));
</script>
