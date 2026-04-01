<template>
  <div>
    <LoginIntro
      :flow-return-to="flow.return_to"
      :second-factor="isSecondFactorStep"
    />
    <v-alert
      v-if="submitError"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="clearSubmitError"
    >
      {{ submitError }}
    </v-alert>

    <KratosFlowUi
      v-if="flow"
      :flow="flow"
      :nodes="filteredLoginNodes"
      :submitting="submitting"
      id-prefix="kratos-login"
      :intercept-ory-programmatic-submit="interceptOryProgrammaticSubmit"
      @submit="(form, submitter) => submitLoginForm(form, submitter)"
    >
      <template #fieldset="{ displayNodes: flowNodes, allNodeIndices: flatIndices }">
        <template v-if="!showMfaGroupTabs">
          <template v-for="idx in flatIndices" :key="'node-' + idx">
            <KratosFlowUiNodeAt
              :idx="idx"
              :passkey-login-trigger="passkeyTriggerForNode(flowNodes[idx])"
            />
          </template>
        </template>
        <template v-else>
          <template v-for="idx in defaultNodeIndices" :key="'node-def-' + idx">
            <KratosFlowUiNodeAt
              :idx="idx"
              :passkey-login-trigger="passkeyTriggerForNode(flowNodes[idx])"
            />
          </template>
          <v-tabs
            v-model="mfaTab"
            color="primary"
            density="comfortable"
            class="mb-1"
          >
            <v-tab v-for="g in nonDefaultGroupsInOrder" :key="g.key">
              {{ groupTabTitle(g.key) }}
            </v-tab>
          </v-tabs>
          <v-window v-model="mfaTab">
            <v-window-item
              v-for="g in nonDefaultGroupsInOrder"
              :key="'win-' + g.key"
            >
              <template v-for="idx in g.indices" :key="'node-tab-' + idx">
                <KratosFlowUiNodeAt
                  :idx="idx"
                  :passkey-login-trigger="passkeyTriggerForNode(flowNodes[idx])"
                />
              </template>
            </v-window-item>
          </v-window>
        </template>
      </template>
    </KratosFlowUi>
  </div>
</template>

<script setup lang="ts">
import type { LoginFlow, UiNode } from "@ory/client";
import { computed, toRef } from "vue";
import KratosFlowUi from "../common/KratosFlowUi.vue";
import KratosFlowUiNodeAt from "../common/KratosFlowUiNodeAt.vue";
import {
  filterOutMergedLoginTriggerButton,
  findPasskeyOrWebAuthnLoginTrigger,
  shouldMergePasskeyTriggerIntoIdentifier,
} from "../common/kratosLoginPasskeyInIdentifier.ts";
import { isKratosInputNode } from "../common/kratosNodeUtils.ts";
import LoginIntro from "./LoginIntro.vue";
import { login_intro } from "./LoginIntro.strings.ts";
import { useKratosMfaGroupTabs } from "./useKratosMfaGroupTabs.ts";
import { useLoginFlow } from "./useLoginFlow.ts";

const props = defineProps<{
  flow: LoginFlow;
}>();

const { submitting, submitError, clearSubmitError, submitLoginForm } =
  useLoginFlow(toRef(props, "flow"));

/** Ory `webauthn.js` calls `form.submit()` after passkey login; patch so `@submit.prevent` runs (see `kratosFormSubmitOryPatch.ts`). */
const interceptOryProgrammaticSubmit = computed(() =>
  props.flow.ui.nodes.some((n) => n.group === "passkey" || n.group === "webauthn"),
);

const filteredLoginNodes = computed(() =>
  filterOutMergedLoginTriggerButton(true, props.flow.ui.nodes),
);

const {
  isSecondFactorStep,
  nonDefaultGroupsInOrder,
  defaultNodeIndices,
  showMfaGroupTabs,
  mfaTab,
} = useKratosMfaGroupTabs(() => props.flow, filteredLoginNodes);

const passkeyLoginTriggerNode = computed(() =>
  findPasskeyOrWebAuthnLoginTrigger(props.flow.ui.nodes),
);

const mergePasskeyIntoIdentifier = computed(() =>
  shouldMergePasskeyTriggerIntoIdentifier(true, props.flow.ui.nodes),
);

function passkeyTriggerForNode(node: UiNode | undefined): UiNode | null | undefined {
  if (
    !mergePasskeyIntoIdentifier.value ||
    !node ||
    !isIdentifierTextField(node) ||
    !passkeyLoginTriggerNode.value
  ) {
    return undefined;
  }
  return passkeyLoginTriggerNode.value;
}

function isIdentifierTextField(node: UiNode): boolean {
  if (!isKratosInputNode(node)) return false;
  if (node.attributes.name !== "identifier") return false;
  const t = node.attributes.type;
  return t !== "hidden" && t !== "submit" && t !== "button";
}

function groupTabTitle(group: string): string {
  const s = login_intro;
  const map: Record<string, string> = {
    code: s.mfa_tab_code,
    totp: s.mfa_tab_totp,
    webauthn: s.mfa_tab_webauthn,
    passkey: s.mfa_tab_passkey,
    lookup_secret: s.mfa_tab_lookup_secret,
  };
  return map[group] ?? group.replace(/_/g, " ");
}
</script>

<style scoped>
/* Passkey trigger uses append-inner icon; emphasize affordance slightly */
:deep(.kratos-flow-form__identifier-with-passkey .v-field__append-inner) .v-icon {
  opacity: 1;
}
</style>
