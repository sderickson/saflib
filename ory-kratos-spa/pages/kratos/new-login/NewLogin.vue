<template>
  <v-container class="py-8" max-width="720">
    <LoginFlowCreatedView
      v-if="queryData instanceof LoginFlowCreatedResult"
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
  LoginFlowCreated as LoginFlowCreatedResult,
  SessionAlreadyAvailable,
} from "@saflib/ory-kratos-sdk";
import { useNewLoginLoader } from "./NewLogin.loader.ts";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import LoginFlowCreatedView from "./LoginFlowCreated.vue";
import SessionAlreadyAvailableComponent from "../common/SessionAlreadyAvailable.vue";
import { computed, toValue } from "vue";

const { createLoginFlowQuery } = useNewLoginLoader();

const queryData = computed(() => toValue(createLoginFlowQuery.data));
</script>
