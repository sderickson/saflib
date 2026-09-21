<template>
  <KratosFlowUi
    v-if="flow && showForm"
    :flow="flow"
    :nodes="nodes"
    :submitting="submitting"
    :id-prefix="idPrefix"
    :message-filter="messageFilter"
    :intercept-ory-programmatic-submit="group === 'passkey'"
    :identity-passkey-display-fallback="identityPasskeyDisplayFallback"
    @submit="onSubmit"
  />
  <p v-else-if="flow" class="text-body-2 text-medium-emphasis">
    {{ t(emptyCopy) }}
  </p>
</template>

<script setup lang="ts">
import type { SettingsFlow, UiText } from "@ory/client";
import { computed } from "vue";
import type { KratosFlowUiMessageFilterContext } from "../common/kratosUiMessages.ts";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import KratosFlowUi from "../common/KratosFlowUi.vue";
import { settings_group_empty as strings } from "./Settings.strings.ts";
import {
  settingsNodesForGroup,
  settingsNodesForProfileFields,
  settingsNodesHaveVisibleInputs,
  type ProfileSettingsFields,
} from "./Settings.logic.ts";

const props = withDefaults(
  defineProps<{
    flow: SettingsFlow;
    group: "profile" | "password" | "totp" | "passkey";
    submitting: boolean;
    idPrefix: string;
    /**
     * When `group` is `profile`, which traits to show as editable.
     * Other traits remain hidden inputs so submits keep a full traits object.
     */
    profileFields?: ProfileSettingsFields;
    messageFilter?: (
      message: UiText,
      context: KratosFlowUiMessageFilterContext,
    ) => boolean;
    /** Passkey remove-button label fallback when Kratos has no AAGUID display name (see KratosFlowUi). */
    identityPasskeyDisplayFallback?: string;
  }>(),
  {
    profileFields: "all",
  },
);

const { t } = useReverseT();

const emptyCopy = computed(() =>
  props.group === "profile"
    ? props.profileFields === "email"
      ? strings.no_email_fields
      : strings.no_profile_fields
    : props.group === "password"
      ? strings.no_password_fields
      : props.group === "totp"
        ? strings.no_totp_fields
        : strings.no_passkey_fields,
);

const nodes = computed(() => {
  if (props.group === "profile" && props.profileFields !== "all") {
    return settingsNodesForProfileFields(props.flow, props.profileFields);
  }
  return settingsNodesForGroup(props.flow, props.group);
});

const showForm = computed(() => settingsNodesHaveVisibleInputs(nodes.value));

const emit = defineEmits<{
  submit: [form: HTMLFormElement, submitter: HTMLElement | null];
}>();

function onSubmit(form: HTMLFormElement, submitter: HTMLElement | null) {
  emit("submit", form, submitter);
}
</script>
