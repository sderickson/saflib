<template>
  <v-container class="py-8" max-width="720">
    <SettingsAalReauthRedirect
      v-if="queryData instanceof BrowserRedirectRequiredResult"
      :redirect-browser-to="queryData.payload.redirect_browser_to"
    />
    <SettingsFlowCreatedView
      v-else-if="queryData instanceof SettingsFlowCreatedResult"
      :result="queryData"
    />
    <UnhandledResponsePanel v-else :result="queryData" />
  </v-container>
</template>

<script setup lang="ts">
import {
  BrowserRedirectRequired as BrowserRedirectRequiredResult,
  SettingsFlowCreated as SettingsFlowCreatedResult,
} from "@saflib/ory-kratos-sdk";
import { useNewSettingsLoader } from "./NewSettings.loader.ts";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import SettingsFlowCreatedView from "./SettingsFlowCreated.vue";
import SettingsAalReauthRedirect from "../settings/SettingsAalReauthRedirect.vue";
import { computed, toValue } from "vue";

const { createSettingsFlowQuery } = useNewSettingsLoader();

const queryData = computed(() => toValue(createSettingsFlowQuery.data));
</script>
