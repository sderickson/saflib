<template>
  <AsyncPage
    v-if="!flowId"
    :loader="useNewSettingsLoader"
    :page-component="SettingsSectionCreate"
    :page-props="createPageProps"
  />
  <AsyncPage
    v-else
    :loader="useSettingsLoader"
    :page-component="Settings"
    :page-props="settingsPageProps"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";
import { AsyncPage } from "@saflib/vue/components";
import { useNewSettingsLoader } from "../new-settings/NewSettings.loader.ts";
import { useSettingsLoader } from "./Settings.loader.ts";
import type { SettingsTabQueryValue } from "./Settings.logic.ts";

const props = defineProps<{
  /**
   * Account (or host) settings section to show. Maps to former settings `tab=` values
   * (`email` | `password` | `totp` | `sessions`).
   */
  section: SettingsTabQueryValue;
}>();

const route = useRoute();

const flowId = computed(() =>
  typeof route.query.flow === "string" ? route.query.flow : undefined,
);

const settingsPath = computed(() => route.path);

const createPageProps = computed(() => ({
  settingsPath: settingsPath.value,
  tab: props.section === "passkey" ? null : props.section,
}));

const settingsPageProps = computed(() => ({
  section: props.section,
  embedded: true,
  flowCreatePath: settingsPath.value,
}));

const SettingsSectionCreate = defineAsyncComponent(
  () => import("./SettingsSectionCreate.vue"),
);
const Settings = defineAsyncComponent(() => import("./Settings.vue"));
</script>
