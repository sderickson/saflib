<template>
  <v-container class="py-8" max-width="720">
    <RegistrationFlowCreatedView
      v-if="queryData instanceof RegistrationFlowCreatedResult"
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
  RegistrationFlowCreated as RegistrationFlowCreatedResult,
  SessionAlreadyAvailable,
} from "@saflib/ory-kratos-sdk";
import { useNewRegistrationLoader } from "./NewRegistration.loader.ts";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import RegistrationFlowCreatedView from "./RegistrationFlowCreated.vue";
import SessionAlreadyAvailableComponent from "../common/SessionAlreadyAvailable.vue";
import { computed, toValue } from "vue";

const { createRegistrationFlowQuery } = useNewRegistrationLoader();

const queryData = computed(() => toValue(createRegistrationFlowQuery.data));
</script>
