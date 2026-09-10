<template>
  <SettingsAalReauthRedirect
    v-if="queryData instanceof BrowserRedirectRequiredResult"
    :redirect-browser-to="queryData.payload.redirect_browser_to"
  />
  <SettingsFlowCreatedRedirect
    v-else-if="queryData instanceof SettingsFlowCreatedResult"
    :result="queryData"
  />
  <UnhandledResponsePanel v-else :result="queryData" />
</template>

<script setup lang="ts">
import {
  BrowserRedirectRequired as BrowserRedirectRequiredResult,
  SettingsFlowCreated as SettingsFlowCreatedResult,
} from "@saflib/ory-kratos-sdk";
import { useNewSettingsLoader } from "./NewSettings.loader.ts";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import SettingsFlowCreatedRedirect from "../settings/SettingsFlowCreatedRedirect.vue";
import SettingsAalReauthRedirect from "../settings/SettingsAalReauthRedirect.vue";
import { computed, toValue } from "vue";

const { createSettingsFlowQuery } = useNewSettingsLoader();

const queryData = computed(() => toValue(createSettingsFlowQuery.data));
</script>
