<template>
  <SettingsAalReauthRedirect
    v-if="queryData instanceof BrowserRedirectRequiredResult"
    :redirect-browser-to="queryData.payload.redirect_browser_to"
  />
  <SettingsFlowCreatedRedirect
    v-else-if="queryData instanceof SettingsFlowCreatedResult"
    :result="queryData"
    :settings-path="settingsPath"
    :tab="tab"
  />
  <UnhandledResponsePanel v-else :result="queryData" />
</template>

<script setup lang="ts">
import { computed, toValue } from "vue";
import {
  BrowserRedirectRequired as BrowserRedirectRequiredResult,
  SettingsFlowCreated as SettingsFlowCreatedResult,
} from "@saflib/ory-kratos-sdk";
import { useNewSettingsLoader } from "../new-settings/NewSettings.loader.ts";
import UnhandledResponsePanel from "../common/UnhandledResponsePanel.vue";
import SettingsAalReauthRedirect from "./SettingsAalReauthRedirect.vue";
import SettingsFlowCreatedRedirect from "./SettingsFlowCreatedRedirect.vue";
import type { SettingsTabQueryValue } from "./Settings.logic.ts";

defineProps<{
  settingsPath: string;
  tab?: SettingsTabQueryValue | null;
}>();

const { createSettingsFlowQuery } = useNewSettingsLoader();

const queryData = computed(() => toValue(createSettingsFlowQuery.data));
</script>
